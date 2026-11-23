# THE PAUSE PROJECT — Phase 1 production blueprint

**Owner/student:** Nidhish  
**Assignment:** Year 10 multimodality in digital texts, topic (e): Bullying and Cyberbullying: Prevention and Support  
**Phase status:** 1 of 5 — the responsive, accessible editorial foundation and central animation state engine are written. The complex shader/audio/portal systems are deliberately not claimed as completed.

## 1. Honest audit of the simpler default

A typical school website would use an animated hero, three informational cards, a quiz, and a footer. That fulfils a checklist but would fail the requested flagship benchmark. The initial blind spots such a plan has are:

- **X — Performance physics:** 50,000 GPU particles, refraction, bloom and 4D noise have a material fill-rate and shader cost; frame rate cannot be guaranteed by source code. The expanded system requires a one-renderer GPU graph, quality tiers, capped DPR, pass budget, frustum culling, benchmark gates, and static fallback.
- **Y — Narrative ethics:** A dazzling cyberbullying website can accidentally turn real harm into spectacle. The experience therefore puts agency, empathy and safer choices at the centre. Visual violence, shame, fabricated victim quotes, and shareable user disclosures are excluded.
- **Z — Security/deployment constraints:** GitHub Pages does not accept arbitrary HTTP response headers. A strict HTML meta CSP is enforceable there but cannot deliver frame-ancestors or all other headers. An optional `_headers` file is included for compatible hosts. No public comments, user identities, saved sensitive confessions or network backend will exist.
- **A fourth practical risk — Motion accessibility:** continuous camera fly-through can disorient people. The site preserves keyboard navigation, readable text in the DOM, correct semantics and native scrolling under `prefers-reduced-motion` / coarse touch; a standalone static CSS artwork can replace the 3D centerpiece.

## 2. Identity: THE SECOND BEFORE SEND

**Concept:** "THE PAUSE PROJECT" — the second between impulse and impact. Every chapter changes the meaning of the same suspended object. The visitor journeys from recognising a harmful pattern to choosing a safe response and accessing help.

**Art direction:** digital editorial brutalism meets scientific instrument. Large elegant high-contrast serif headlines, precise mono coordinates, negative space, giant punctuation, extremely selective warm refraction and calibrated physics. No purple-blue AI gradient, no template icon cards, no stock people.

**Typography (self-hosted in build):** Instrument Serif (display + italic) and IBM Plex Mono (UI + annotations). Running text uses accessible system sans as a neutral utility face; no third remote font.

**Four source palette tokens:**

| Role | Token | Hex |
| --- | --- | --- |
| Background | `--background` | `#0A0D12` |
| Surface | `--surface` | `#161E27` |
| Accent | `--accent` | `#FFAA75` |
| Muted ink | `--muted-ink` | `#A9B6C2` |

Light text and optical glow are mixes based on these colours; they aren't additional brand tokens.

## 3. Exact repository selection

**Runtime dependencies:**

1. `greensock/GSAP` — ScrollTrigger timeline/camera orchestration and one GSAP ticker.
2. `darkroomengineering/lenis` — scroll easing; its RAF is driven by the GSAP ticker. No parallel RAF owners.
3. `mrdoob/three.js` — a single WebGL2 rendering engine for custom GLSL vertex/fragment shader materials, instanced/point-based particles, and `EffectComposer` passes in later phases.

**Design-system references, applied as authoring guidance rather than shipping their runtime code:**

4. `nextlevelbuilder/ui-ux-pro-max-skill` — typography hierarchy, semantic affordances, responsive UX, accessible states.
5. `cathrynlavery/diagram-design` — carefully laid out, self-contained SVG diagrams for recognition, intervention and reporting in Phase 4.

**Not selected:** `react-three-fiber`, `drei`, `shadcn`, `magicui`, `aceternity`, `react-bits`, `motiondivision/motion` would add React and/or a competing motion system. `barbajs` conflicts with single-scene spatial navigation. `vanta`, `ogl` duplicate renderer concerns; `anime` and `lottie` duplicate animation infrastructure. Awwwards inspiration repositories and Stitch patterns may inform aesthetics but are not runtime imports. This keeps a deliberately small dependency graph.

## 4. Narrative and scene state machine

| Stage | Narrative | Visual / motion | Accessible alternative |
| --- | --- | --- | --- |
| Preloader | A short symbolic hold before the first message | Asynchronously prepare shaders, scene and assets; reveal immediately when ready | No forced timer or blank blocking view; semantic content renders first |
| Hero | A moment before SEND | 4D noisy iridescent suspended pause artifact, Fresnel/dispersion, gravity ripples | Static CSS pause sculpture / no canvas |
| Hyper-Scroll / Chapter 01 | Recognise | Z-space camera crosses drifting message fragments; shard changes shape | Real DOM article and keyboard anchor |
| Chapter 02 | Intervene | Camera redirects particles around a choice point | Concrete alternatives to joining in |
| Interactive Lesson Lab / Chapter 03 | Support | User-driven, non-judgemental branching diagram, evidence/report/support path | Native buttons, controls and SVG accessible labels |
| Outro / Chapter 04 | Make a better next move | Shards gather into a stable, warm halo; optical effects ease away | Readable summary + link to eSafety |

No form in this project transmits information. Any future local reflection interface will never ask users to enter names, addresses, passwords, or a description of their bullying experiences.

## 5. Render contract for Phase 2–5

`src/core/state.ts` is the only public state contract. The renderer receives scroll position, chapter, velocity, cursor position, viewport, visibility, quality tier, portal, reduced-motion, and sound flags. `src/core/experience.ts` is the single owner of Lenis / GSAP integration. Future consumers use `store.onFrame(...)`, not new independent requestAnimationFrame loops.

- **Desktop quality:** WebGL2, one renderer, 50,000–65,536 particles in a batched GPU draw path, render at capped effective DPR (target <= 1.75), noise and refraction approximations budgeted together. Start with **60fps target**, then measure p95 frame times on real hardware; 60fps is not promised universally.
- **Mid quality:** 12,000–24,000 particles, reduced ray steps, half-resolution bloom, optional optical passes disabled.
- **Low quality:** 2,000–6,000 particles or CSS scene, minimal post processing, DPR <= 1.
- **Reduced motion/no WebGL:** zero particles, zero camera fly-through, no audio autoplay; real content and links remain usable.
- **Frame gating:** at 60Hz, 16.7ms total/frame; renderer should target ~10ms GPU, ~3ms CPU, leaving time for layout and browser variability. Over-budget repeated frames automatically downgrade quality; upgrade only after sustained headroom to avoid oscillation.
- **Memory:** dispose shaders, geometries, render targets, frame listeners and audio contexts when replaced/unmounted, and restore WebGL contexts where possible.

**Optics truthfulness:** GLSL "glass", "subsurface", and chromatic dispersion in a real-time browser scene are fast screen-space / shader approximations, not physically complete path-traced materials.

## 6. Security and privacy

- Vite compiles local modules; **no third-party CDN script/style/font** is authorised in production.
- In production: `script-src 'self'`; `style-src 'self'`; `connect-src 'self'`; `default-src 'none'`; disabled external form submits, frames, workers, object embeds.
- Google font providers are not contacted; font files come from local npm packages and are compiled into site assets.
- DOM chapters are static and future dynamic copies must be updated with `textContent`, `createTextNode`, or a well-vetted sanitizer. Current code uses no `innerHTML` with untrusted strings.
- The shipped CSP **meta tag** works on GitHub Pages but cannot enforce `frame-ancestors`; `_headers` adds this and other response headers only on supporting hosts.
- Dev-only Vite CSS HMR requires a locally scoped CSP relaxation of `style-src` and websocket connect. Production output remains strict.
- No telemetry, account system, analytics, backend, location request or external user comment wall.

## 7. Content sources

- Australian eSafety Commissioner, "Bullying online": https://www.esafety.gov.au/young-people/cyberbullying (reviewed 23 November 2026). The educational advice about saving evidence, reporting content, limiting contact, getting help and safe bystander intervention is adapted and linked.
- Source lesson supplied by user: "Multimodality in Digital Texts — Websites & Blogs", Activity 2 topic (e), with visual, written and interactive requirements.

## 8. Phase boundaries

**Phase 1 ships:** codebase, responsive static hero, coherent informational sections, global type/palette, proper links, accessible semantic HTML, GSAP/Lenis state provider, reduced-motion adaptation, GitHub workflow, CSP fallback and host header recipe.

**Phase 2 adds:** GLSL 4D hologram and GPU particle field with 50k high-tier gate.

**Phase 3 adds:** camera choreography, bloom/aberration/grain and performance feedback.

**Phase 4 adds:** opt-in Web Audio, tactile reticle, kinetic typography and accessible interactive lesson diagrams.

**Phase 5 adds:** spatial portals, specular overlays, mobile/fallback reliability pass, full critique and complete final ZIP.
