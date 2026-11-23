"""Phase 4 source and research-attribution contract checks. No GPU claims."""
from pathlib import Path
import re, json
root = Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text()
main = (root/'src/main.ts').read_text()
css = (root/'src/styles/phase4.css').read_text()
audio = (root/'src/core/audio.ts').read_text()
lesson = (root/'src/core/lesson.ts').read_text()
reticle = (root/'src/core/reticle.ts').read_text()
manifest = json.loads((root/'package.json').read_text())
assert "'unsafe-inline'" not in html and "'unsafe-eval'" not in html
assert len(re.findall(r'<script\b', html)) == 1 and 'src="/src/main.ts"' in html
assert not re.search(r'\bon(?:click|load|error|change|input)\s*=', html)
for name in ['sound-toggle','voice-toggle','pause-moment','magnetic-reticle','recognition-diagram','action-diagram',
             'support-diagram','data-bar-0','data-bar-1','data-bar-2','panel-prevalence','panel-bystander',
             'lesson-announcement','chart-description','chart-primary-value','chart-summary']:
    assert re.search(r'\bid="'+name+r'"', html), name
for key in ['createSoundNarration(store)','createKineticInterface(store)','createLessonInteraction(store)']:
    assert key in main, key
for key in ['AudioContext', 'createDynamicsCompressor', 'createOscillator', 'speechSynthesis', 'SpeechSynthesisUtterance',
            'cancelNarration', 'context.resume()', 'context?.close()', 'document.hidden']:
    assert key in audio, key
for key in ['onFrame', 'Math.exp', 'matchMedia', 'data-cursor', 'pointermove', 'destroy']:
    assert key in reticle, key
for key in ['IntersectionObserver', 'data-recognition', 'data-choice', 'data-support-step', 'setAttribute',
            'datasets', 'updateChart', 'mode = selected', 'observer?.disconnect']:
    assert key in lesson, key
assert '<span id="chart-primary-value">53</span>' in html and '38%' in html and '57%' in html
assert 'December 2024–February 2025' in html and '3,454' in html
assert 'not an Australian cyberbullying trial' in html
assert 'www.esafety.gov.au/research/the-online-experiences-of-children-in-australia/snapshot-cyberbullying' in html
assert 'www.stopbullying.gov/resources/research-resources/bystanders-are-essential' in html
assert '@media (prefers-reduced-motion: reduce)' in css
assert 'pointer-events: none' in css and '.visually-hidden' in css
assert 'test:phase4' in manifest['scripts']
assert 'npm run test:phase4' in (root/'.github/workflows/deploy.yml').read_text()
assert not re.search(r'\b(innerHTML|outerHTML|insertAdjacentHTML|eval)\b', audio + lesson + reticle)
print('PASS: Phase 4 structure, safe text updates, accessibility, provenance, and integration invariants')
