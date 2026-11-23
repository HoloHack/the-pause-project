# Phase 5 technical handoff — final integration

## Architectural principles

One Vite/TypeScript application, one Three.js renderer, one GSAP ticker, one Lenis controller. Original Phase 1–4 source remains present. 17 inherited Phase 4 TS/CSS/GLSL files are unchanged. The camera journey and main entry point were extended in place; all new enhancements are separate modules and an additive CSS layer.

## New files and behaviors

- `src/core/portal.ts` — Five-chapter `dialog` navigation, progressive GSAP portal timeline, scroll-to-chapter, state portal signals, focus restoration, image fallbacks, parallax updates and specular border coordinates.
- `src/core/wall.ts` — Six fictional student voices, category filters, locally saved reflections, reactions, deletion, safe `textContent` rendering, input limits and client-only contact-detail screening. Maximum 30 local entries. Not a shared service or a full moderation solution.
- `src/styles/phase5.css` — Editorial photo-and-art bento frames, adaptive glass panels, responsive navigation, transitions, form states, mobile spacing, contrast and reduced-motion fallbacks.
- `public/images/*.webp` — Two locally generated, compressed editorial illustrations.
- `index.html` — Full accessible chapter menu, atmospheric portal overlay, image credits and captions, local pledge form; strict CSP image domain allowlist.
- `src/graphics/camera.ts` — Small bounded dolly impulse controlled by existing `store.portal` while preserving the Catmull–Rom chapter path.
- `src/main.ts` — Composes the two Phase 5 controllers, safe failure boundaries, and respects `defaultPrevented` when the portal has handled a link.

## CSS and graphics resilience

The portal veil is an HTML/CSS overlay; its only role is to cover a chapter transition while the existing scroll engine moves. Camera dolly derives from a single portal state; it does **not** create a second camera or renderer. Reduced motion skips the transition entirely. The original hero illustration and new chapter images remain available when shader compilation or WebGL2 fails.

## CSP considerations

The meta CSP and `vite.config.ts` use `img-src 'self' data: https://images.unsplash.com`. The `_headers` file has the same allowlist and contains additional response-only headers for hosts that support them. HTML event attributes are prohibited. User input is inserted via `textContent`. There is no DOM-based HTML parsing of comments. CSS custom properties set programmatically control specular highlights and image parallax without executable inline HTML handlers.

## Educational integrity

Statistics and their limitations remain sourced from Australia's eSafety Commissioner and the explicitly separate observational study of **in-person** peer intervention. No claim is made that 57% is the success rate for online bystander actions. Photography is mood-setting, not documentary evidence of actual cyberbullying experiences.
