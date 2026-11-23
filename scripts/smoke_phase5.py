"""HTML/CSS + actual compiled Phase 5 controllers with GSAP/navigation mock.
Not a substitute for the Vite build, live WebGL, real audio or hardware benchmarking.
"""
from pathlib import Path
from contextlib import contextmanager
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import subprocess,re
root=Path(__file__).resolve().parent.parent

def transpile(path):
    node="""const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');const out=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});if(out.diagnostics?.length){process.stderr.write(JSON.stringify(out.diagnostics));process.exit(1)}process.stdout.write(out.outputText)"""
    result=subprocess.run(['node','-e',node,str(root/path)],capture_output=True,text=True,check=True)
    return re.sub(r'^import .*?;\n','',result.stdout,flags=re.M).replace('export function ','function ').replace('export class ','class ')

controllers='''
  const gsap={timeline(opts){let sets=0;const tl={set(){sets++;if(sets>1)opts?.onComplete?.();return tl;},to(_el,args){args?.onComplete?.();return tl;},kill(){}};return tl;}};
  const listeners=new Set();
  const state={chapter:'threshold',portal:'closed',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  const store={snapshot:state,onChange(cb){listeners.add(cb);return ()=>listeners.delete(cb);},patch(change){Object.assign(state,change);for(const cb of listeners)cb(state);}};
  const runtime={scrollTo(target){document.querySelector(target)?.scrollIntoView({behavior:'instant'});}};
'''+transpile(Path('src/core/portal.ts'))+'\n'+transpile(Path('src/core/wall.ts'))+'''
 window.__test5={store,portal:createPortalNavigation(store,runtime),wall:createReflectionWall()};
'''

html=(root/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+/>','',html)
html=html.replace('<script type="module" src="/src/main.ts"></script>','')
css='\n'.join((root/f'src/styles/{s}').read_text() for s in ['global.css','phase4.css','phase5.css']).replace("@import 'lenis/dist/lenis.css';",'')
html=html.replace('</head>',f'<style>{css}</style></head>')
# Substitute image sources with the two real local editorial artworks only in
# the test harness, since the browser blocks remote Unsplash and local navigation.
import base64
from html import escape
art={name:'data:image/webp;base64,'+base64.b64encode((root/'public/images'/name).read_bytes()).decode('ascii') for name in ['hold-the-moment.webp','human-connection.webp']}
preview_html=html
preview_html=preview_html.replace('src="./images/hold-the-moment.webp"',f'src="{art["hold-the-moment.webp"]}"')
preview_html=preview_html.replace('src="./images/human-connection.webp"',f'src="{art["human-connection.webp"]}"')
preview_html=re.sub(r'src="https://images\.unsplash\.com/[^"]+"',lambda m: f'src="{art["human-connection.webp"]}"',preview_html)
harness=root/'__phase5_test_harness.html';harness.write_text(html)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

@contextmanager
def server():
    import os
    from functools import partial
    httpd=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
    th=Thread(target=httpd.serve_forever,daemon=True);th.start()
    try: yield f'http://127.0.0.1:{httpd.server_port}/__phase5_test_harness.html'
    finally: httpd.shutdown();th.join(timeout=3)

# Browser navigation is blocked in this environment. Render an embedded page and
# inject the actual transpiled controllers, with a deterministic Web Storage mock.
try:
 with sync_playwright() as browser_tools:
    browser=browser_tools.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for name,w,h,reduce in [('desktop',1440,900,False),('tablet',768,1024,False),('mobile',390,844,False),('compact',320,680,False),('reduced',390,844,True)]:
      context=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce' if reduce else 'no-preference')
      page=context.new_page();page.set_default_timeout(4500);errors=[]
      page.on('pageerror',lambda err:errors.append(str(err)))
      page.set_content(preview_html,wait_until='domcontentloaded',timeout=10000)
      page.evaluate('''() => { const map=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return map.has(k)?map.get(k):null},setItem(k,v){map.set(k,String(v))},removeItem(k){map.delete(k)},clear(){map.clear()}}}); }''')
      page.evaluate(controllers)
      assert page.locator('.reflection-card').count()==6, name
      assert page.locator('#reflection-count').inner_text().startswith('0 local')
      page.locator('#menu-open' if w>760 else '#menu-open-secondary').click()
      assert page.locator('#chapter-menu').is_visible(), name
      assert page.locator('#chapter-menu a').count()==5, name
      page.locator('#chapter-menu a[href="#support"]').click()
      assert not page.locator('#chapter-menu').is_visible(), name
      assert page.evaluate('location.hash')=='#support', name
      page.locator('#reflection-category').select_option('pledge')
      attack='<img src=x onerror=alert(1)> I will ask a trusted adult.'
      page.locator('#reflection-text').fill(attack)
      page.locator('#reflection-form button[type="submit"]').click()
      assert page.locator('#reflection-count').inner_text().startswith('1 local')
      entry=page.locator('.reflection-card').filter(has_text='I will ask a trusted adult.')
      assert entry.count()==1
      assert '<img src=x onerror=alert(1)>' in entry.locator('p').text_content()
      assert entry.locator('img').count()==0
      entry.locator('button[data-action="react"]').click()
      assert entry.locator('button[data-action="react"]').get_attribute('aria-pressed')=='true'
      page.locator('[data-wall-filter="action"]').click()
      assert page.locator('.reflection-card').count()==2
      page.locator('[data-wall-filter="pledge"]').click()
      assert page.locator('.reflection-card').count()==3
      page.locator('[data-wall-filter="all"]').click()
      page.locator('#reflection-text').fill('Contact me at test@example.com and we can chat')
      page.locator('#reflection-form button[type="submit"]').click()
      assert page.locator('#reflection-count').inner_text().startswith('1 local')
      assert 'remove names' in page.locator('#reflection-feedback').inner_text()
      overflow=page.evaluate('document.documentElement.scrollWidth - innerWidth')
      assert overflow<=1,(name,overflow)
      assert not errors, (name,errors)
      if name in ('desktop','mobile'):
          page.locator('#top').screenshot(path=str(root/f'FINAL_HERO_{name.upper()}.png'),timeout=30000)
          page.locator('#pledge-wall').screenshot(path=str(root/f'FINAL_WALL_{name.upper()}.png'),timeout=30000)
      # Reinitialise the actual controllers with the same mock store to prove persistence.
      page.evaluate('window.__test5.portal.destroy();window.__test5.wall.destroy();')
      page.evaluate(controllers)
      assert page.locator('#reflection-count').inner_text().startswith('1 local'), name
      preserved=page.locator('.reflection-card').filter(has_text='I will ask a trusted adult.')
      assert preserved.count()==1
      assert preserved.locator('button[data-action="react"]').get_attribute('aria-pressed')=='true'
      preserved.locator('button[data-action="delete"]').click()
      assert page.locator('#reflection-count').inner_text().startswith('0 local')
      page.evaluate('window.__test5.portal.destroy();window.__test5.wall.destroy();')
      print(name,'navigation/wall/XSS/filter/reaction/reinitialisation/deletion', 'overflow',overflow,'errors',len(errors))
      context.close()
    browser.close()
 print('PASS: Isolated Phase 5 browser controllers/layout (mock storage; no live Vite/GPU)')
finally:
 harness.unlink(missing_ok=True)
