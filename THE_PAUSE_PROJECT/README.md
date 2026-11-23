# THE PAUSE PROJECT — Final Source Release

A five-chapter, multimodal school experience about bullying, cyberbullying, safe bystander choices, support and digital empathy. Built for Nidhish as Website #3.

## Launch on GitHub Pages

1. Create an empty GitHub repository. Copy **all contents of this `THE_PAUSE_PROJECT` folder** to its repository root, including `.github/`.
2. In repository settings, under **Pages**, choose **GitHub Actions** as the deployment source.
3. Commit to the `main` branch. The included workflow runs source validation, resolves dependencies, runs the TypeScript/Vite build, and deploys the **`dist/` folder**.
4. Open the URL reported by the successful Pages deployment, then manually test it on a real device with WebGL2 enabled.

Local development on a Node 22 machine:

```bash
npm install
npm run dev
npm run test:static
npm run test:shaders
npm run test:phase3
npm run test:phase4
npm run test:phase5
npm run build
npm run preview
```

`npm run dev` is local-only; Vite's default test URL is `http://127.0.0.1:5173`. `base: './'` in `vite.config.ts` is intentional to support a project-level GitHub Pages path. Keep `.github/workflows/deploy.yml` and the `public` directory intact.

## Chapter map

| Chapter | Story | Interaction |
|---|---|---|
| 00 — The Hold | Why the moment before sending matters | Holographic pause artifact, trigger, sound and optional narration |
| 01 — Recognise | Pattern, power and impact; Australian research | Editable lesson schematic and evidence chart |
| 02 — Intervene | Refuse to amplify harmful content; safer bystander responses | Branching intervention diagram |
| 03 — Support | Preserve evidence, report, protect and connect | Connected support pathway |
| 04 — The Next Move | Personal commitment to digital empathy | Local reflection, reaction and pledge wall |

Menu selections work as normal anchors without animation. With JavaScript, the same links can trigger spatial portal transitions. Art and information remain visible if graphics fail.

## Interactive wall: deliberately NOT a public feed

This release is a static GitHub Pages site. The wall **cannot** share comments across visitors without a backend, a moderation policy and suitable privacy controls. It presents six clearly labelled **fictional** examples, and lets each visitor write, filter, appreciate and delete their own **local** notes. Comments and reactions are saved only in that browser's `localStorage`; no account or external database is used. The interface rejects contact details and renders every text entry as `textContent`, not HTML. A user can clear the local content. Visitors should avoid identifying classmates or entering personal details. Browser storage may be disabled or cleared at any time.

## Images and licensing

Two original generated editorial images are stored in `public/images/` (`hold-the-moment.webp` and `human-connection.webp`). Three separate editorial photos load from the single whitelisted domain `images.unsplash.com`, each with descriptive `alt`, a visible photo credit and a local generated-art fallback. See [ASSET_CREDITS.md](ASSET_CREDITS.md). If a school network blocks Unsplash, the fallback artworks preserve the layout. The remote photographs do not represent actual students involved in bullying.

## Security and performance

- Production HTML meta CSP is compatible with GitHub Pages and includes `img-src 'self' data: https://images.unsplash.com`.
- `public/_headers` documents an enhanced HTTP response-header configuration for capable hosts; **GitHub Pages does not enforce it**. In particular, meta CSP cannot enforce the `frame-ancestors` directive. We cannot promise full server-side security controls on GitHub Pages.
- No inline HTML event handlers, no external analytics, no external backend, and no remote JS dependencies at runtime. NPM libraries bundle into `dist/`.
- 65,536 GPU particle instances are defined in the high-quality tier (with smaller adaptive tiers); **60fps is a target, not a verified result**.
- WebGL context failure, low-end devices, static layout and reduced-motion preferences are supported by fallbacks.
- Audio and speech are user-controlled and off by default.

## Important QA limitation

Source-level checks, standalone wall TypeScript checking, the previous Phase 4 controller tests and the isolated Phase 5 UI/controller browser harness passed. The current sandbox blocks npm package registry access, local HTTP navigation and WebGL2 context creation. Therefore the **full dependency-installed Vite production build, integrated GSAP/Lenis/Three.js browser runtime, live photo loading, real audio playback and GPU framerate remain unverified**. The included GitHub Actions workflow performs the actual build once uploaded and reports build failures transparently. Run it before submitting your assignment link.

For full details, read [QA_PHASE_5.md](QA_PHASE_5.md) and [FINAL_IMPLEMENTATION.md](FINAL_IMPLEMENTATION.md).
