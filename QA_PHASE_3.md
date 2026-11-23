# THE PAUSE PROJECT — Phase 3 verification record

**Verified locally:**

1. `python3 scripts/validate_static.py` — pass (Phase 1 structural/security checks).
2. `python3 scripts/validate_shaders.py` — pass (Phase 2 shader source invariants, not GPU compilation).
3. `python3 scripts/validate_phase3.py` — pass (camera, optical pipeline, selective bloom source, fallback, required uniforms and security invariants).
4. Global TypeScript compiler's AST parser — eight source `.ts` files parsed with zero syntax diagnostics. This is not semantic TypeScript checking.
5. `python3 scripts/smoke_fallback.py` — pass for 1440x900, 768x1024, 390x844 and 390x844 reduced motion. All five chapters present; SVG/CSS illustration visible; zero document horizontal overflow; zero browser page exceptions.
6. Visual inspection of `PHASE_3_FALLBACK_DESKTOP.png` and `PHASE_3_FALLBACK_MOBILE.png` — spotted and corrected the z-index issue that initially hid the navigation.
7. Verified actual Three.js r180 source behavior for `UnrealBloomPass`: its `renderTargetsHorizontal[0]` contains bloom-only mips before it is additively mixed back into the source buffer. Corrected the composite to use this source instead of doubling the entire bloom-composer framebuffer.

**Environment blockers / NOT VERIFIED:**

- `npm` could not resolve `registry.npmjs.org` (EAI_AGAIN); dependencies cannot be installed in this container. No full `tsc --noEmit && vite build` was run.
- The earlier Chromium WebGL2 shader-compile attempt in Phase 2 returned no available WebGL2 context. The Phase 3 shaders and composer are NOT GPU-compiled, framebuffer-verified or WebGL-rendered here.
- FPS, GPU milliseconds, alpha correctness in hardware, perceived camera smoothness and device compatibility have NOT been empirically measured. GPU query instrumentation exists in source but has not executed in a GPU-capable browser.
- The screenshots are **CSS-only fallback previews**, not GPU results.
- No actual GitHub Pages deployment tested; this is a source ZIP.

**Required owner / CI acceptance commands (network-connected):**

```sh
npm install
npm run test:static
npm run test:shaders
npm run test:phase3
npm run build
npm run dev
```

After compiling, test normal mode, mobile, `prefers-reduced-motion`, WebGL context loss, fast-scroll camera travel and scroll back, performance/heat on physical devices and all chapter anchor links. If optical passes fail on a device, verify the direct-render fallback and no console exception loop.

**Quality and visual review (Phase 3 corrections):**

- Fix 1: a hero-only canvas could not support continuous camera travel; moved canvas to one fixed, viewport-wide background.
- Fix 2: sampling the bloom-composer framebuffer added the original artifact twice; use the bloom-only intermediate instead.
- Fix 3: the new stacking layer initially covered the top navigation; header priority was restored and the visual smoke test was rerun.
