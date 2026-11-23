"""Dependency-free source invariants, not a substitute for actual GPU compilation."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
shaders = root / 'src/graphics/shaders'
files = ['noise4d.glsl', 'artifact.vert.glsl', 'artifact.frag.glsl', 'particles.vert.glsl', 'particles.frag.glsl']
for name in files:
    content = (shaders / name).read_text()
    clean = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', content)
    assert clean.count('{') == clean.count('}'), f'Unbalanced shader blocks in {name}'
    assert 'TODO' not in clean and 'placeholder' not in clean.lower(), name
    assert 'void main()' in clean or name == 'noise4d.glsl', name
    assert not re.search(r'\b(?:eval|discard)\s*\(', clean), name
noise = (shaders / 'noise4d.glsl').read_text()
assert 'for (int a = 0; a < 2;' in noise
assert all(f'for (int {v} = 0; {v} < 2;' in noise for v in 'abcd')
assert 'gradient4' in noise and 'smoothPart' in noise
vertex = (shaders / 'artifact.vert.glsl').read_text()
assert '#include "./noise4d.glsl"' in vertex and 'noise4D(' in vertex
particle = (shaders / 'particles.vert.glsl').read_text()
assert 'attribute vec4 aParticle' in particle and 'uWarp' in particle and 'uPointer' in particle
assert 'geometry.instanceCount = count' in (root / 'src/graphics/particles.ts').read_text()
assert 'high: 65536' in (root / 'src/graphics/particles.ts').read_text()
assert 'WebGLRenderer' in (root / 'src/graphics/spatial.ts').read_text()
assert 'webglcontextlost' in (root / 'src/graphics/spatial.ts').read_text()
assert 'prefers-reduced-motion' in (root / 'src/styles/global.css').read_text()
assert 'spatial-scene' in (root / 'index.html').read_text()
print('PASS: Phase 2 shader/source invariants (GPU compile not performed)')
