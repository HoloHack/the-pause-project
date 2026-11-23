"""Chromium CSS + isolated Phase 4 interactions test without third-party npm packages.
Does not execute the actual Vite/Three.js/GSAP integrated production bundle.
"""
from pathlib import Path
import tempfile
import re
import subprocess
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as output:
    cp = subprocess.run(['tsc','--outDir',output,'--target','ES2022','--module','ESNext',
        '--moduleResolution','bundler','--lib','DOM,DOM.Iterable,ES2022','--strict','--skipLibCheck',
        '--noUncheckedIndexedAccess','src/core/audio.ts','src/core/reticle.ts','src/core/lesson.ts',
        'src/core/state.ts'], cwd=root, capture_output=True, text=True)
    if cp.returncode: raise RuntimeError(cp.stdout+'\n'+cp.stderr)
    files = [Path(output)/'audio.js',Path(output)/'reticle.js',Path(output)/'lesson.js']
    if not files[0].exists(): files = [Path(output)/'core'/f for f in ['audio.js','reticle.js','lesson.js']]
    scripts = '\n'.join(re.sub(r'\bexport\s+(?=function|class|const|let)', '', p.read_text()) for p in files)
    scripts += '''
        const mockState = {chapter:'threshold',portal:'closed',scrollY:0,scrollProgress:0,
            scrollVelocity:0,velocityIntensity:0,pointerX:0,pointerY:0,viewportWidth:window.innerWidth,
            viewportHeight:window.innerHeight,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
            visible:true,quality:'static',audioEnabled:false};
        const frameCallbacks = new Set();
        const mockStore = {snapshot:mockState,patch(change){Object.assign(mockState,change)},onFrame(cb){frameCallbacks.add(cb);return ()=>frameCallbacks.delete(cb)},
            frame(dt){for(const cb of frameCallbacks)cb(mockState,dt)}};
        window.__phase4 = {sound:createSoundNarration(mockStore),reticle:createKineticInterface(mockStore),lesson:createLessonInteraction(mockStore),store:mockStore};
    '''
    html = (root/'index.html').read_text()
    html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+/>', '', html)
    html = html.replace('<script type="module" src="/src/main.ts"></script>', '')
    css = ((root/'src/styles/global.css').read_text().replace("@import 'lenis/dist/lenis.css';",'')+'\n'+(root/'src/styles/phase4.css').read_text())
    html = html.replace('</head>','<style>'+css+'</style></head>')
    with sync_playwright() as play:
        browser = play.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for name,w,h,reduce in [('desktop',1440,900,False),('tablet',768,1024,False),('mobile',390,844,False),('reduced',390,844,True)]:
            page = browser.new_page(viewport={'width':w,'height':h}, reduced_motion='reduce' if reduce else 'no-preference')
            errors = []
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.set_content(html, wait_until='domcontentloaded')
            page.evaluate(scripts)
            assert page.locator('#chart-primary-value').inner_text() == '53'
            page.locator('[data-period="recent"]').click()
            assert page.locator('#chart-primary-value').inner_text() == '38'
            assert page.locator('#data-label-1').text_content() == '42%'
            page.locator('[data-period="lifetime"]').click()
            assert page.locator('#data-label-1').text_content() == '57%'
            page.locator('[data-evidence-tab="bystander"]').click()
            assert page.locator('#panel-bystander').is_visible()
            assert not page.locator('#panel-prevalence').is_visible()
            page.locator('[data-evidence-tab="prevalence"]').click()
            page.locator('[data-recognition="1"]').click()
            assert page.locator('#recognition-cue').text_content() == 'PATTERN + POWER + HARM'
            page.locator('[data-choice="2"]').click()
            assert page.locator('#action-diagram').get_attribute('data-path') == 'report'
            page.locator('[data-support-step="3"]').click()
            assert page.locator('#support-step-title').text_content() == 'Tell someone'
            page.locator('#pause-moment').click()
            assert 'better choice' in page.locator('#pause-response').inner_text()
            page.evaluate('''() => { __phase4.store.patch({chapter:'recognise',scrollVelocity:14}); __phase4.store.frame(0.016); }''')
            stats = page.evaluate('''() => ({overflow:document.documentElement.scrollWidth-innerWidth,
                bodyWidth:document.body.scrollWidth, viewportWidth:innerWidth,
                chapters:document.querySelectorAll('[data-chapter]').length, diagrams:document.querySelectorAll('.lesson-diagram').length,
                narration:document.querySelector('#voice-toggle')?.disabled === false,
                reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
                chartSummary:document.querySelector('#chart-summary').textContent,
                cursorDisplay:getComputedStyle(document.querySelector('#magnetic-reticle')).display})''')
            print(name,stats,'errors=',errors)
            assert stats['overflow'] <= 1, stats
            assert stats['chapters'] == 5 and stats['diagrams'] == 3
            assert not errors, errors
            if reduce: assert stats['cursorDisplay'] == 'none'
            if name in ('desktop','mobile'):
                page.screenshot(path=str(root/f'PHASE_4_FALLBACK_{name.upper()}.png'), full_page=False)
                page.locator('#recognise').screenshot(path=str(root/f'PHASE_4_RECOGNISE_{name.upper()}.png'))
                page.locator('#evidence').screenshot(path=str(root/f'PHASE_4_EVIDENCE_{name.upper()}.png'))
            page.evaluate('''() => {__phase4.lesson.destroy();__phase4.reticle.destroy();__phase4.sound.destroy()}''')
            page.close()
        browser.close()
print('PASS: Four viewport/reduced-motion simulations, data views, diagrams, controls and no JS page errors')
