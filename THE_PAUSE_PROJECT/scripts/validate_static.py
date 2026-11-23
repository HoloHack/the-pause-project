from pathlib import Path
import re
import json
import sys

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'src/styles/global.css').read_text()
code = (root / 'src/core/experience.ts').read_text()
manifest = json.loads((root / 'package.json').read_text())
assert html.count('http-equiv="Content-Security-Policy"') == 1
assert "script-src 'self'" in html and "style-src 'self'" in html
assert "'unsafe-inline'" not in html and "'unsafe-eval'" not in html
assert '<script type="module" src="/src/main.ts"></script>' in html
assert 'onclick=' not in html.lower() and 'onerror=' not in html.lower()
assert css.count('--background:') == 1 and css.count('--surface:') == 1
assert css.count('--accent:') == 1 and css.count('--muted-ink:') == 1
assert 'prefers-reduced-motion' in css
assert 'ScrollTrigger.update()' in code and 'gsap.ticker.add(ticker)' in code
assert 'instance.destroy()' in code and "{ passive: true }" in code
assert {'three', 'lenis', 'gsap'} <= set(manifest['dependencies'])
ids = set(re.findall(r'\bid="([^"]+)"', html))
for target in re.findall(r'href="#([^"]+)"', html):
    assert target in ids, f'Broken anchor: {target}'
for file in ['public/favicon.svg', 'public/_headers', '.github/workflows/deploy.yml', 'src/main.ts', 'src/core/state.ts', 'src/core/experience.ts']:
    assert (root / file).is_file(), file
print('PASS: Phase 1 static/security/structure checks')
