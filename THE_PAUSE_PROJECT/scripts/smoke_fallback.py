"""Render CSS-only fallback at several viewport sizes without npm packages.
The bundled WebGL/GSAP runtime is NOT loaded by this test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
root = Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text()
css = (root/'src/styles/global.css').read_text().replace("@import 'lenis/dist/lenis.css';", '')
html = html.replace('<script type="module" src="/src/main.ts"></script>', '')
html = html.replace('</head>', '<style>'+css+'</style></head>')
# No inline script is introduced; iframe-free static preview can ignore CSP meta
# because this is testing layout only, not the hosted production policy.
html = html.replace('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'self\'; script-src \'self\'; style-src \'self\'; font-src \'self\'; img-src \'self\' data:; connect-src \'self\'; media-src \'self\'; worker-src \'none\'; frame-src \'none\'; object-src \'none\'; form-action \'none\'; upgrade-insecure-requests" />', '')
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for label, viewport, reduce in [('desktop',(1440,900),False), ('tablet',(768,1024),False), ('mobile',(390,844),False), ('reduced',(390,844),True)]:
        page = browser.new_page(viewport={'width':viewport[0], 'height':viewport[1]}, reduced_motion='reduce' if reduce else 'no-preference')
        errors=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html, wait_until='domcontentloaded')
        page.wait_for_timeout(170)
        stats = page.evaluate('''() => ({overflow:document.documentElement.scrollWidth-window.innerWidth,
          hero:!!document.getElementById('hero-title'),
          chapters:[...document.querySelectorAll('[data-chapter]')].length,
          canvasHidden:document.querySelector('#spatial-scene').hidden,
          fallbackVisible:getComputedStyle(document.querySelector('.pause-sculpture')).visibility !== 'hidden'})''')
        if label in ['desktop','mobile']:
            page.screenshot(path=str(root/f'PHASE_3_FALLBACK_{label.upper()}.png'), full_page=False)
        checks.append((label, stats, errors))
        page.close()
    browser.close()
for name, values, errors in checks:
    print(f'{name}: {values}, pageErrors={len(errors)}')
    assert values['overflow'] <= 1 and values['hero'] and values['chapters'] == 5
    assert values['canvasHidden'] and values['fallbackVisible'] and not errors
print('PASS: Phase 3 fallback renders at 1440/768/390 widths and reduced motion')
