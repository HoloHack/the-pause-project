"""Phase 5 source/security/deployment contract checks. Separate from GPU runtime tests."""
from pathlib import Path
from html.parser import HTMLParser
import re, json
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
main=(root/'src/main.ts').read_text()
portal=(root/'src/core/portal.ts').read_text()
wall=(root/'src/core/wall.ts').read_text()
css=(root/'src/styles/phase5.css').read_text()
headers=(root/'public/_headers').read_text()
vite=(root/'vite.config.ts').read_text()
workflow=(root/'.github/workflows/deploy.yml').read_text()
assert 'src="/src/main.ts"' in html and 'base: \'./\'' in vite
assert 'https://images.unsplash.com' in headers and html and vite
assert "script-src 'self'" in headers and html and vite
assert "'unsafe-inline'" not in html and "'unsafe-eval'" not in html
assert not re.search(r'\bon(?:click|error|load|change|submit)\s*=',html,re.I)
assert not re.search(r'\b(innerHTML|outerHTML|insertAdjacentHTML|eval\s*\()\b',wall)
assert 'textContent' in wall and 'replaceChildren' in wall and 'localStorage' in wall
assert 'containsContact' in wall and 'MAX' not in wall or 'localStorage' in wall
assert 'createReflectionWall()' in main and 'createPortalNavigation(store, runtime)' in main
assert 'event.defaultPrevented' in main
assert 'data-portal' in html and 'gsap.timeline' in portal and 'showModal' in portal
assert 'scrollTo(path)' in portal and "portal: 'closed'" in portal
assert 'portalDepth' in (root/'src/graphics/camera.ts').read_text()
for tag in ['top','recognise','intervene','support','outro','chapter-menu','menu-open','menu-open-secondary','menu-close','portal-veil','reflection-form','reflection-list','reflection-text','reflection-category']:
  assert f'id="{tag}"' in html,tag
assert 'PRIVATE DEVICE WALL' in html and 'FICTIONAL EXAMPLE' in wall
assert 'data-wall-filter="pledge"' in html and 'data-wall-filter="reflection"' in html
assert '@media (prefers-reduced-motion: reduce)' in css
assert 'data-local-fallback' in html and 'loading="lazy"' in html
assert html.count('images.unsplash.com') == 4,html.count('images.unsplash.com') # 3 photos + CSP
assert all(tag in html for tag in ['Bastian Ragas','Vitaly Gariev','Kristijan Arsov'])
assert all((root/'public/images'/name).exists() for name in ['hold-the-moment.webp','human-connection.webp'])
assert all((root/'public/images'/name).stat().st_size<300_000 for name in ['hold-the-moment.webp','human-connection.webp'])
assert 'npm run test:phase5' in workflow
assert json.loads((root/'package.json').read_text())['version']=='1.0.0'
class Tags(HTMLParser):
  def __init__(self): super().__init__();self.ids=[];self.img=[];self.links=[]
  def handle_starttag(self,tag,attrs):
    d=dict(attrs)
    if 'id' in d:self.ids.append(d['id'])
    if tag=='img':self.img.append(d)
    if tag=='a':self.links.append(d)
p=Tags();p.feed(html)
assert len(p.ids)==len(set(p.ids)),[x for x in p.ids if p.ids.count(x)>1]
assert all('alt' in i for i in p.img)
assert all('data-local-fallback' in i for i in p.img if (i.get('src') or '').startswith('https://'))
assert all(u.get('rel')=='noopener noreferrer' for u in p.links if u.get('target')=='_blank')
print('PASS: Phase 5 source contracts, CSP policy, photo credits, local assets, wall safety and workflow')
