"""Dependency-free invariants for Phase 3. Does not claim a GPU compile or full build."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
read = lambda path: (root / path).read_text()
html = read('index.html')
css = read('src/styles/global.css')
spatial = read('src/graphics/spatial.ts')
post = read('src/graphics/postprocessing.ts')
camera = read('src/graphics/camera.ts')
fragment = read('src/graphics/shaders/optical.frag.glsl')
artifact = read('src/graphics/artifact.ts')
assert html.count('id="spatial-scene"') == 1
assert html.count('id="spatial-backdrop"') == 1
assert html.index('id="spatial-backdrop"') < html.index('class="hero-stage"')
assert '.spatial-backdrop' in css and 'position: fixed;' in css
assert '.site.spatial-active .chapter' in css
assert '.spatial-backdrop { display: none !important; }' in css
assert 'createCameraJourney' in spatial and 'journey.update(delta)' in spatial
assert 'createOpticalPipeline' in spatial and 'optical.render(delta, elapsed, warp)' in spatial
assert "renderer.render(scene, camera)" in spatial  # failsafe, direct render retained
assert 'webglcontextlost' in spatial and 'webglcontextrestored' in spatial
assert 'EXT_disjoint_timer_query_webgl2' in spatial
assert 'gl.QUERY_RESULT_AVAILABLE' in spatial and 'gl.endQuery(timer.TIME_ELAPSED_EXT)' in spatial
assert 'const scene = new THREE.Scene()' in spatial and spatial.count('new THREE.WebGLRenderer') == 1
assert 'EffectComposer' in post and 'UnrealBloomPass' in post and 'OutputPass' in post
assert 'camera.layers.set(BLOOM_LAYER)' in post and 'camera.layers.mask = savedMask' in post
assert 'bloomComposer.renderToScreen = false' in post
assert 'bloomPass.renderTargetsHorizontal[0]' in post
assert 'finalComposer.addPass(outputPass)' in post
assert 'layers.enable(1)' in artifact and 'layers.enable(1)' not in read('src/graphics/particles.ts')
assert 'new THREE.CatmullRomCurve3' in camera and 'ScrollTrigger.create' in camera
assert 'trigger?.kill()' in camera and 'unsubscribe()' in camera
for uniform in ('tDiffuse', 'uBloom', 'uVelocity', 'uResolution', 'uTime', 'uFocus', 'uBloomStrength'):
    assert re.search(r'\b' + uniform + r'\b', fragment) and re.search(r'\b' + uniform + r'\b', post)
assert fragment.count('{') == fragment.count('}')
assert 'TODO' not in fragment and 'placeholder' not in fragment.lower()
assert "'unsafe-inline'" not in html and "'unsafe-eval'" not in html
assert 'eval(' not in spatial + post + camera
print('PASS: Phase 3 structure, optics, camera, accessibility and security invariants')
