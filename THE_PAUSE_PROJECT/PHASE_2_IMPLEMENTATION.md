# THE PAUSE PROJECT — Phase 2 / Spatial GPU systems

## Status and scope

Phase 2 updates the **existing Phase 1 source**; it is not a separate demo. It adds a real Three.js WebGL2 rendering path to the hero, retains the illustrated no-WebGL presentation, and uses the shared Lenis + GSAP state. The Phase 3 optical chain and camera transition choreography have NOT been added.

## Render graph

```
ExperienceStore (Phase 1)
    ├── pointer, chapter, scroll velocity, quality, visibility
    └── GSAP ticker -> onFrame
              └── SpatialExperience, only when hero intersects viewport
                    ├── WebGLRenderer (single alpha/WebGL2 canvas)
                    ├── PerspectiveCamera (Phase 3 can control camera rig)
                    ├── ParticleField (one InstancedBufferGeometry Mesh)
                    └── Artifact
                         ├── SphereGeometry with custom 4D-noise GLSL
                         ├── reversed shell for holographic rear rim
                         ├── two luminous capsule pause bars
                         └── three understated orbit rings
```

### Artifact mathematics

- `noise4d.glsl` is an original **4D gradient Perlin-style noise** function, NOT an implementation of Simplex noise. It samples 16 corners of a 4D lattice, each with a unit gradient computed from a deterministic hash. Contribution weights are the product of four quintic fades `6t^5 - 15t^4 + 10t^3`, yielding C2-smooth interpolation at grid boundaries. Fourth coordinate is `uTime`.
- `artifact.vert.glsl` computes two noise octaves, a damped cursor-centered angular ripple, phase-dependent shear, and narratively resolving deformation, entirely in the vertex shader. `uMorph` comes from visible hero scroll distance and chapter state, smoothed across changes in the main render loop.
- `artifact.frag.glsl` uses Fresnel rim lighting, view-dependent procedural reflections, refractive directions against an analytic environment, RGB phase-shifted thin-film interference and approximated light wrap/transmission. **This is an intentionally artistic screen-independent glass approximation**, not actual scene-texture refraction or path-traced subsurface scattering.
- Approximate original-mesh normals are used to constrain GPU cost. Finite-difference displaced normals are a possible Phase 3 close-up improvement if benchmarks allow.

### Particle mathematics

- One `THREE.InstancedBufferGeometry`, four base vertices per quad, six triangle indices, each instance receiving a starting XY/Z/phase attribute and speed/width attribute.
- High quality: **65,536 GPU instances** in a single instanced draw; balanced: 24,576; low: 8,192; reduced-motion/static: 0.
- `mod(...)` wraps each particle in a 32-unit-deep Z volume, `uWarp` increases motion speed and radial streak length, and a Gaussian-like XY attraction pulls particles toward the cursor without altering CPU-side position arrays.
- A feathered fragment gradient avoids harsh rectangle edges. Geometry receives an explicit broad bounding sphere for field-level Three.js frustum culling.
- No per-particle DOM elements, CPU stepping loops per frame, object-per-particle meshes, heavy SVG filters or network imagery.

## Performance and lifecycle

- Only creates WebGL2 context if motion is allowed and supported.
- A lazy import keeps the optional graphics chunk out of the static path.
- Caps DPR according to viewport and tier. Draws only when the hero is in/near the viewport; suspends work on hidden tabs.
- Quality governor: decreases high → balanced → low after sustained over-budget CPU frame intervals, with a cooldown to prevent thrashing. This is a heuristic **not GPU timestamp instrumentation** and not a 60fps guarantee.
- Debounced resize and the existing store avoid redundant event handlers.
- Handles context loss by showing the CSS artwork, tries to resume on restoration, disposes shader materials, geometry and listeners on teardown.
- Real HTML headings, lesson sections, navigation and support links work with WebGL unavailable. Scene is marked decorative (`aria-hidden`).
- No additional external scripts, telemetry, inputs, backend, unsafe interpolation or audio (Phase 4).

## Files added / changed

Added: `src/graphics/artifact.ts`, `src/graphics/particles.ts`, `src/graphics/spatial.ts`, five shader modules in `src/graphics/shaders/`, `scripts/validate_shaders.py`, `scripts/check_glsl_browser.py`, this document and QA record.

Changed: `index.html`, `src/main.ts`, `src/core/experience.ts` (native scroll velocity and warp release), `src/styles/global.css`, `package.json` (including `@types/three`). The rest of Phase 1 is preserved.

## Real-world validation required

1. Run `npm install`, `npm run test:static`, `npm run test:shaders`, `npm run build` on a machine with npm registry access.
2. In a WebGL2 browser, verify shader compilation, no console errors, pointer displacement and post-scroll particle streak response.
3. Test 1440×900 desktop, 768×1024 tablet, 390×844 phone, reduced motion and simulated WebGL context loss.
4. Use actual GPU profiling to measure p95 frame time and adjust 65,536/high tier thresholds. The browser in this environment could not create WebGL2 and npm was DNS-restricted.

## Handoff to Phase 3

`src/graphics/spatial.ts` owns the **single renderer, Scene, PerspectiveCamera and `rig` group**. Integrate camera timeline, color/glow render targets and Phase 3 optical passes in this one module; do not introduce another Three.js renderer or GSAP ticker. Replace the final direct `renderer.render(scene, camera)` with the composer render only after hardware testing, and keep `scene` drawing as fallback if any postprocess fails.

## Technical references

- Three.js ShaderMaterial (GLSL uniforms and custom attributes): https://threejs.org/docs/pages/ShaderMaterial.html
- Three.js WebGLRenderer (lifecycle and context restoration): https://threejs.org/docs/pages/WebGLRenderer
- Phase 1 source architecture: `PHASE_1_BLUEPRINT.md`
