import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/global.css';
import './styles/phase4.css';
import './styles/phase5.css';

import { createExperienceStore } from './core/state';
import { createExperienceRuntime } from './core/experience';
import type { SpatialExperience } from './graphics/spatial';
import { createSoundNarration } from './core/audio';
import { createKineticInterface } from './core/reticle';
import { createLessonInteraction } from './core/lesson';
import { createPortalNavigation } from './core/portal';
import { createReflectionWall } from './core/wall';

const store = createExperienceStore();
const runtime = createExperienceRuntime(store);
// Phase 4 controllers share the existing state/ticker, with isolated failures.
const optionalSystems: Array<{ destroy(): void }> = [];
try { optionalSystems.push(createSoundNarration(store)); }
catch (error) { console.warn('Audio controls unavailable.', error); }
try { optionalSystems.push(createKineticInterface(store)); }
catch (error) { console.warn('Pointer enhancement unavailable.', error); }
try { optionalSystems.push(createLessonInteraction(store)); }
catch (error) { console.warn('Lesson interactions unavailable; text remains readable.', error); }
try { optionalSystems.push(createPortalNavigation(store, runtime)); }
catch (error) { console.warn('Portal navigation unavailable; regular links remain usable.', error); }
try { optionalSystems.push(createReflectionWall()); }
catch (error) { console.warn('Local reflection wall unavailable; educational content remains readable.', error); }

// The GPU bundle loads only when motion is allowed. Static HTML/CSS content
// remains complete when WebGL2, dynamic import or dependencies fail.
let spatial: SpatialExperience | null = null;
let spatialLoading = false;
let pageDestroyed = false;
const maybeLoadSpatial = (): void => {
  if (pageDestroyed || spatial || spatialLoading || store.snapshot.quality === 'static') return;
  spatialLoading = true;
  void import('./graphics/spatial').then(({ createSpatialExperience }) => {
    if (!pageDestroyed) spatial = createSpatialExperience(store);
  }).catch((error: unknown) => {
    console.warn('Optional spatial layer unavailable; illustrated fallback is intact.', error);
  }).finally(() => { spatialLoading = false; });
};
const unsubscribeSpatialLoader = store.onChange(maybeLoadSpatial);
maybeLoadSpatial();
const progress = document.querySelector<HTMLElement>('#progress-bar');
const chapterName = document.querySelector<HTMLElement>('#active-chapter');
let lastChapter = '';
let lastProgress = -1;

const unsubscribe = store.onChange((state) => {
  if (progress && Math.abs(state.scrollProgress - lastProgress) >= 0.001) {
    progress.style.transform = `scaleX(${state.scrollProgress.toFixed(4)})`;
    lastProgress = state.scrollProgress;
  }
  if (chapterName && state.chapter !== lastChapter) {
    chapterName.textContent = `CURRENT: ${state.chapter.toUpperCase()}`;
    lastChapter = state.chapter;
  }
});

// Normal anchors stay functional if JavaScript or smooth scrolling is unavailable.
const onLinkClick = (event: MouseEvent): void => {
  const target = event.target;
  if (event.defaultPrevented || !(target instanceof Element)) return;
  const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const destination = link.getAttribute('href');
  if (!destination || destination === '#' || !document.getElementById(destination.slice(1))) return;
  event.preventDefault();
  history.replaceState(null, '', destination);
  runtime.scrollTo(destination);
};
document.addEventListener('click', onLinkClick);

// Reserve the main thread for semantic content if any later WebGL subsystem fails.
document.documentElement.classList.add('enhanced');

window.addEventListener('pagehide', () => {
  pageDestroyed = true;
  unsubscribeSpatialLoader();
  for (const system of optionalSystems.reverse()) system.destroy();
  spatial?.destroy();
  document.removeEventListener('click', onLinkClick);
  unsubscribe();
  runtime.destroy();
  store.dispose();
}, { once: true });
