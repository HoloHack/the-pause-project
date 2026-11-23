# THE PAUSE PROJECT — Phase 4 integration report

## Scope
This is **Phase 4 only** of a five-part school multimodal digital experience. The foundation is reconstructed from the immutable Phase 3 source archive, preserving the original shaders, spatial scene, GSAP/Lenis state engine, optical passes, camera path, and CSP. Phase 5 (portals, glass overlays, final integration polish) remains unstarted.

## New modules
- `src/core/audio.ts` — opt-in browser Web Audio: two quiet sine oscillators (55 and 82.41 Hz) routed through a compressor, velocity-responsive hum gain, short synthesized hover tones, and a layered chord when the Pause control is pressed. The context is created and resumed only after the visitor activates the sound button. It pauses on page invisibility and is disposed with the site.
- `src/core/reticle.ts` — context-aware reticle on fine-pointer, hover-capable devices, with spring-like exponential damping, magnetic target pull, and labels for the current interaction. The reticle never intercepts input events. A shared scroll-velocity state gently skews visible chapter headings; reduced-motion users keep stable headings and the standard cursor.
- `src/core/lesson.ts` — three original interactive SVG schematics: identify pattern/power/harm in a hypothetical situation, choose a safer bystander response, and explore four support actions. An IntersectionObserver animates the paths once; reduced-motion users see the paths immediately. All selection controls are actual buttons with pressed state, explanatory text, and screen-reader announcements.
- `src/styles/phase4.css` — layout and styles for the new modules, graphs, sound/voice controls, reticle, and responsive/reduced-motion variants.

## Aural mode
`NARRATE` uses the browser Web Speech API (SpeechSynthesisUtterance in `en-AU`), reading an explicit short text for the active chapter. It is entirely optional and cancellable; the button is disabled if the browser does not support synthesis. Speech voices and pronunciation vary by browser and operating system. The full content remains readable without audio. Sound is opt-in and independent of narration.

## Evidence graph
A switchable, interactive SVG chart uses the Australian eSafety Commissioner's survey of **3,454 children aged 10–17** conducted **December 2024–February 2025**. It distinguishes **ever** cyberbullied vs **in the past 12 months**:

| Age | Ever | In previous 12 months |
| --- | ---: | ---: |
| 10–12 | 46% | 34% |
| 13–15 | 57% | 42% |
| 16–17 | 59% | 39% |

Overall: 53% ever, 38% in the last 12 months. This research predates the social-media minimum-age restrictions introduced in Australia in December 2025. The chart has a textual description and a permanently visible data table.

The second view shows **57%** as a *historical peer-intervention finding from observed in-person school bullying episodes* in which classmates intervened and bullying ceased within ten seconds. It is **not** an Australian estimate, **not** specific to cyberbullying, and **not** a guarantee or probability that intervention will succeed. It is placed in a separate tab with contextual warnings, not overlaid on the Australian prevalence series.

Original source URLs:
- https://www.esafety.gov.au/research/the-online-experiences-of-children-in-australia/snapshot-cyberbullying
- https://www.stopbullying.gov/resources/research-resources/bystanders-are-essential
- https://www.esafety.gov.au/young-people/cyberbullying

## Security and stability
- The original strict HTML CSP (`script-src 'self'`, `style-src 'self'`, no `unsafe-inline`, no `unsafe-eval`) and `_headers` are preserved. GitHub Pages cannot enforce all custom HTTP headers; the CSP meta is the practical fallback.
- No comments, forms, accounts, telemetry, persistence, or backend.
- All dynamic copy is fixed strings assigned with `.textContent`, not HTML injection.
- External sources use fixed URLs with `target="_blank" rel="noopener noreferrer"`.
- GPU initialization is optional and unchanged. If it fails, the static illustration and HTML lesson remain available.
- Speech and sound never autoplay; both are under the visitor's control.
- The reticle is decorative and inaccessible to assistive technology, while focus rings and native pointer remain available.

## Phase 5 handoff
Build the original Phase 5 spatial portals, contextual glass panels, and polished mobile fallbacks on top of this code. Do not add a second renderer/ticker. Verify full npm build, GPU shader compile, reduced-motion and keyboard behaviour, assistive-technology narration, and real devices before production publishing.
