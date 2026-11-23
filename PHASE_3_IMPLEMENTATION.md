# THE PAUSE PROJECT — Phase 3 implementation

**Scope:** Selective bloom, optical pipeline, scroll-velocity chromatic separation, vignette, GPU film grain, subtle *artistic* screen-space focus softness, chapter-spanning Catmull–Rom camera travel, fallback hardening. Phase 4 and Phase 5 are not built.

## Render architecture

One WebGL2 context, one THREE.WebGLRenderer and one GSAP ticker are shared by all chapters. The canvas is now in a fixed `.spatial-backdrop` behind the editorial main content. It is decorative (`aria-hidden`) and does not capture pointer or keyboard interactions. The original HTML lesson content and CSS pause sculpture remain functional when shaders, libraries or WebGL2 are unavailable.

```
Lenis -> GSAP ScrollTrigger / ExperienceStore -> existing GSAP ticker
                                      |
          CameraJourney (arc-length Catmull-Rom + smoothing)
                                      |
          Scene: artifact + instanced particle field (Phase 2)
                                      |
                           One THREE.WebGLRenderer
                              /                   \
        Bloom-only camera layer 1            Full camera layers 0+1
            RenderPass                           RenderPass
            UnrealBloomPass                      ShaderPass:
                 |                                - bloom-only composite
          bloom-only mip texture                  - velocity RGB separation
                                                  - vignette/grain
                                                  - screen-space focus softness
                                                 OutputPass
                                                    |
                                                 Alpha canvas
```

### Selective bloom

- The original artifact's front and rear shells and pause bars are on both the normal layer (0) and bloom layer (1). The ring edges and 65,536-particle field are **excluded** from bloom layer 1.
- The bloom composer draws only layer 1, performs UnrealBloomPass's 5-mip blur, and stays offscreen. It uses `UnrealBloomPass.renderTargetsHorizontal[0].texture`, the bloom-only composite. It does **not** add the already-composited source image a second time.
- The final composer draws the full scene, adds that bloom-only texture in a custom ShaderPass, then runs OutputPass for the renderer's output colour space.
- Tier policy: high = stronger bloom and five-tap edge focus softness; balanced = subtler bloom and very low focus blur; low = direct render with no post processing; static = no WebGL.

### Camera travel

`src/graphics/camera.ts` installs one chapter-spanning GSAP ScrollTrigger. Its onUpdate callback drives a normalized progress state. Measured positions of the `top`, `recognise`, `intervene`, `support`, and `outro` elements map story progress onto five milestones of a 7-control-point, arc-length-sampled Catmull–Rom camera path. The shared GSAP ticker smooths progress and rotates the camera toward the artifact. Chapter changes no longer require resetting or replacing a canvas.

The fixed canvas is below semantic content in the stacking order. Transparent dark overlays maintain foreground contrast. `main` and `header` stacking contexts are coordinated, with the navigation header above the story content.

### Optical shader

- Chromatic aberration dynamically separates the R and B channels in proportion to the smoothed magnitude of scroll velocity, with a low-velocity early-out.
- Vignette uses radial falloff from viewport centre.
- Film grain uses a hashed screen-space coordinate and slow temporal stepping, avoiding CPU noise textures and SVG filters.
- Focal softness is a low-sample peripheral blur approximation. **It is not physical depth-of-field and does not sample a depth buffer.**
- `OutputPass` handles output transfer; alpha is retained in the custom ShaderPass so the fixed canvas can overlay the real CSS background.

### Stability / security

- The original strict GitHub Pages-compatible HTML CSP, self-hosted fonts and zero backend remain unchanged.
- GPU quality decreases high -> balanced -> low when sustained frame delay or optional `EXT_disjoint_timer_query_webgl2` results indicate excessive rendering cost. Timer query results are polled asynchronously (no forced GPU sync).
- Postprocessing failure falls back to `renderer.render(scene, camera)`. WebGL context loss restores CSS artwork and attempts to rebuild after context restoration. Full graphics failure switches to static artwork.
- All added graphics resources and ScrollTrigger instances are disposed on teardown.
- This phase adds no user input fields, network forms or dynamic HTML injection.

## Key files

- `src/graphics/postprocessing.ts` — selective two-composer optical pipeline
- `src/graphics/shaders/optical.frag.glsl` — complete optical finishing GLSL
- `src/graphics/camera.ts` — scroll-driven spatial flight curve
- `src/graphics/spatial.ts` — single renderer and optional GPU timer integration
- `src/graphics/artifact.ts` — bloom layer eligibility, original artifact preserved
- `index.html` and `src/styles/global.css` — fixed canvas scene and readable editorial layer
- `scripts/validate_phase3.py`, `scripts/smoke_fallback.py` — source and static browser checks

## Boundaries

Phase 3 does not implement the procedural audio, reticle or diagrams (Phase 4), nor portals or interactive site-wide overlay (Phase 5). It also does **not** prove that WebGL shader compilation succeeds or that 60fps is achieved on a particular device; those require `npm install`, a production build, a WebGL2-capable browser and hardware instrumentation.

## References

- Three.js r180 composer code: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/EffectComposer.js
- Three.js r180 bloom pass: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/UnrealBloomPass.js
- Three.js post-processing manual: https://threejs.org/manual/#en/post-processing
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
