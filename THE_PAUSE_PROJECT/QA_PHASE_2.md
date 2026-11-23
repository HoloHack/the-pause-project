# Phase 2 QA — evidence and limitations

## Checks that passed

- `python3 scripts/validate_static.py`: existing Phase 1 structure/CSP/reference assertions.
- `python3 scripts/validate_shaders.py`: files present, balanced GLSL blocks, four 4D lattice loops, uniforms/instancing/renderer/reduced-motion invariants. **Static structural validation, not GPU shader compilation.**
- Local global TypeScript transpile parser: Phase 1 and new Phase 2 `.ts` files passed syntax parsing (not type checking).
- Headless Chromium rendered dependency-free CSS fallback at 1440×900, 768×1024 (reduced motion) and 390×844. No horizontal overflow; every in-page anchor resolved; CSS sculpture was visible, canvas remained hidden, GPU label hidden.
- Verified that `@types/three` version 0.180.0 and matching Three.js release are published, but neither was installed here.

## Checks that could not run

- `npm install`, `npm run build`, full TS type checking and integrated runtime, because `registry.npmjs.org` returns DNS failure (`EAI_AGAIN`).
- GLSL compilation and linking, although `scripts/check_glsl_browser.py` attempted real shader compilation; headless Chromium produced **no WebGL2 context**, and multiple software-graphics flags did not resolve this.
- Frame-time measurements and appearance of the live GPU hologram or instanced particle streaks, because no WebGL context or npm dependencies were available.
- Real GitHub Pages build, CSP response verification, touch/low-power GPU tests and context restoration event testing.

## Important caveats

- `65,536` is the **code-defined high-quality GPU instance count**, not a count visually confirmed in a running GPU frame.
- Anti-aliasing and post-processing are intentionally deferred to Phase 3. Do not market the current look as true raymarched volume rendering or physically correct refraction: this phase uses a deformed polygonal hologram and artistic GLSL glass approximations.
- The adaptive governor observes frame intervals, not GPU timer queries, so **60fps has not been verified**.
- The WebGL shell should be reviewed on actual hardware for noise continuity, shader linker warnings, transparency order and performance. Accessibility remains useful independently of the optional effect.
