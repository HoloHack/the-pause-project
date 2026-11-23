# Phase 5 — Verification and limitations

## Passed in this environment

- `scripts/validate_static.py`: Phase 1 structure/security invariants.
- `scripts/validate_shaders.py`: Phase 2 shader/source invariants (not a real GPU compiler).
- `scripts/validate_phase3.py`: Phase 3 camera/optics/source invariants.
- `scripts/validate_phase4.py`: Phase 4 content, audio, diagram and chart source contracts.
- `scripts/validate_phase5.py`: Final CSP image allowlist, all assets, no inline handlers, wall safe rendering, full chapter menu, accessible image descriptions, author credits and deployment workflow.
- `tsc` strict no-emit on `src/core/wall.ts` (standalone module): passed.
- TypeScript source syntax/transpile diagnostics of project source: checked (not the dependency-based full program).
- `scripts/smoke_phase4.py`: Existing isolated Phase 4 interactions passed at desktop/tablet/mobile/reduced motion.
- `scripts/smoke_phase5.py`: Real transpiled Phase 5 modules were tested inside embedded Chromium with a GSAP timeline mock and deterministic storage mock. Passed at 1440×900, 768×1024, 390×844, 320×680 and reduced-motion 390×844. Tests exercised full chapter-menu navigation, portal destination, seeded fictional voices, adding text, HTML injection entered as text (not DOM markup), filtering, local reactions, re-initialisation, deletion, contact-details rejection and zero page errors/zero horizontal overflow.
- Responsive screenshot review caught a mobile overlap between fixed narration controls and the chapter launcher; corrected by relocating the audio dock above the launcher. On desktop, the floating launcher is hidden at the hero (header menu remains) to preserve opening-text legibility.
- 17 inherited Phase 4 TS/CSS/GLSL files byte-identical to the previous release; `src/main.ts` and `src/graphics/camera.ts` intentionally changed. No shader source was modified.

## Not verified — do not claim fully live-tested

1. `npm install`/`npm run build` — npm registry is unavailable in the sandbox, including offline cache resolution, so no complete installed-dependency TypeScript/Vite build could run.
2. Live WebGL2, GLSL shader compilation, selective bloom, GPU 65,536 instances and real 60fps — GPU context unavailable. The 50,000+ count is code-defined, not measured performance.
3. Live Lenis/GSAP portal choreography — isolated navigation uses a lightweight GSAP behavior mock; the shipping runtime imports the actual library and must be checked after a real build.
4. Real Unsplash image transfer — the browser sandbox blocks remote image delivery; final screenshots show local art fallback for photography slots.
5. Web Audio speaker output, device screen readers, touch hardware and real Web Storage persistence after browser restart — not verified on physical hardware. Test harness re-initialisation uses a deterministic storage mock.
6. Real GitHub Pages deployment, response headers, cache behavior and cross-device interoperability — needs a real repo and successful Actions run.

## Before school submission

Deploy through GitHub Actions and verify the deployed URL in Chrome and Safari or another mobile browser; confirm HTML loads without console errors; check the primary 3D scene, click portal navigation, test narration and mute, check every original photo or its fallback, submit a private note and refresh, run all three diagrams and both chart tabs, test keyboard navigation and reduced-motion settings. Clear any real personal notes before demo if desired.
