# Phase 4 quality assurance — honest evidence ledger

## Passed in the execution environment
- The source archive's **Phase 1 static/security**, **Phase 2 shader/source**, and **Phase 3 spatial/optics/camera** validation scripts all pass, after integrating Phase 4 into a clean Phase 3 extraction.
- The new Phase 4 validator passes ID uniqueness/anchors, required controllers, static data provenance, accessible controls, lack of inline event handlers, scripts and CSP restrictions.
- Global TypeScript compiler (`tsc`) passes a **strict type-check of the Phase 4 modules** (audio, reticle, lesson, state) using DOM/DOM.Iterable/ES2022 types.
- Chromium via Playwright checks isolated transpiled Phase 4 interaction modules against the real semantic HTML/CSS at **1440×900**, **768×1024**, **390×844**, and **390×844 reduced-motion**.
- These browser sweeps exercise the prevalence period toggle (including numeric labels and changing primary readout), research-tab switching, recognition scenarios, bystander choices, support steps, and the Pause text response.
- All four checks reported **zero page exceptions**, **zero horizontal overflow**, **five chapters**, **three new interactive SVG diagrams**. Reduced-motion disables the reticle.
- Visual screenshots of the real static HTML/CSS fallback were inspected for desktop/mobile; paths were corrected to use explicit normalized `pathLength="1"` for self-drawing animation.

## Not verified / limitations
- `npm install` fails with `EAI_AGAIN` DNS resolution for registry.npmjs.org in this execution environment. **Full Vite production build, integrated GSAP/Lenis runtime, dependency-locked type-check, and real shader/post-process frame rendering were not tested.**
- A WebGL2 context was unavailable in previous GPU tests, so the site is **not independently certified at 60 fps**. Shader compilation and real post-processing output remain unverified.
- Browser code ran from an isolated Phase 4 harness rather than the final Vite bundle. This supports functionality checks, not an end-to-end production assertion.
- Audio synthesis nodes are implemented and checked by source inspection; acoustic output, sound levels, device output compatibility and voice quality **were not measured or audibly verified**.
- Accessibility has semantic/keyboard/reduced-motion implementation and basic smoke checks, but formal screen-reader and WCAG audits remain outstanding.
- Phase 5 portal transitions, glass panels and final end-to-end polish were intentionally not implemented.

## Local verification commands (once dependencies are available)
```bash
npm install
npm run test:static
npm run test:shaders
npm run test:phase3
npm run test:phase4
npm run build
npm run dev
```
Optional independent fallback check (requires global `tsc`, Python Playwright, and Chromium): `python3 scripts/smoke_phase4.py`.

## Research method cautions
The source labels and two panels deliberately avoid comparing Australian prevalence with US historical bystander interventions; they are different populations, contexts, samples, and outcomes. The website text does not equate conflict with bullying or promise any bystander action always works.
