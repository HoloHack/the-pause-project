import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { ChapterId } from './state';
import { chooseInitialQuality, type ExperienceStore } from './state';

export interface ExperienceRuntime {
  scrollTo(target: string | number): void;
  destroy(): void;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const ease = (t: number): number => 1 - Math.pow(1 - t, 4);

export function createExperienceRuntime(store: ExperienceStore): ExperienceRuntime {
  gsap.registerPlugin(ScrollTrigger);
  const cleanup: Array<() => void> = [];
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchQuery = window.matchMedia('(pointer: coarse)');
  let smoothScroll: Lenis | null = null;
  let previousTime = 0;
  let nativeScrollPending = false;
  let previousNativeY = window.scrollY;
  let previousNativeMs = performance.now();
  let resizeTimer = 0;
  let pointerPending = false;
  let pendingX = 0;
  let pendingY = 0;
  const chapterTriggers: ScrollTrigger[] = [];

  const updateScroll = (position: number, velocity: number): void => {
    const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    store.patch({
      scrollY: position,
      scrollProgress: clamp01(position / available),
      scrollVelocity: velocity,
      velocityIntensity: clamp01(Math.abs(velocity) / 28)
    });
  };

  const onNativeScroll = (): void => {
    if (smoothScroll || nativeScrollPending) return;
    nativeScrollPending = true;
    requestAnimationFrame((timestamp) => {
      nativeScrollPending = false;
      const currentY = window.scrollY;
      // Normalize native scroll delta to roughly pixels per 60Hz frame.
      const frameUnits = Math.max(1, (timestamp - previousNativeMs) / (1000 / 60));
      const nativeVelocity = (currentY - previousNativeY) / frameUnits;
      previousNativeMs = timestamp;
      previousNativeY = currentY;
      updateScroll(currentY, nativeVelocity);
    });
  };
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  cleanup.push(() => window.removeEventListener('scroll', onNativeScroll));

  const ticker = (time: number): void => {
    const delta = previousTime === 0 ? 0 : Math.min(0.05, Math.max(0, time - previousTime));
    previousTime = time;
    if (smoothScroll) smoothScroll.raf(time * 1000);
    else if (delta > 0 && store.snapshot.velocityIntensity > 0.002) {
      // Wheel/touch scroll events end abruptly; smoothly release the warp field.
      const release = Math.exp(-delta * 6.5);
      store.patch({
        velocityIntensity: store.snapshot.velocityIntensity * release,
        scrollVelocity: store.snapshot.scrollVelocity * release
      });
    }
    if (store.snapshot.visible) store.frame(delta);
  };
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);
  cleanup.push(() => gsap.ticker.remove(ticker));

  const stopSmoothScroll = (): void => {
    if (!smoothScroll) return;
    const instance = smoothScroll;
    smoothScroll = null;
    instance.destroy();
    document.documentElement.classList.remove('has-lenis');
  };

  const syncScrollMode = (): void => {
    stopSmoothScroll();
    const reduced = reducedQuery.matches;
    store.patch({ reducedMotion: reduced, quality: chooseInitialQuality(reduced) });
    if (reduced || touchQuery.matches) {
      updateScroll(window.scrollY, 0);
      ScrollTrigger.refresh();
      return;
    }
    try {
      const instance = new Lenis({
        duration: 1.12,
        easing: ease,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false
      });
      instance.on('scroll', (event) => {
        updateScroll(event.scroll, event.velocity);
        ScrollTrigger.update();
      });
      smoothScroll = instance;
      document.documentElement.classList.add('has-lenis');
    } catch (error) {
      stopSmoothScroll();
      console.warn('Smooth scrolling unavailable; native scrolling remains active.', error);
    }
    ScrollTrigger.refresh();
  };

  const onMotionChange = (): void => syncScrollMode();
  reducedQuery.addEventListener('change', onMotionChange);
  touchQuery.addEventListener('change', onMotionChange);
  cleanup.push(() => reducedQuery.removeEventListener('change', onMotionChange));
  cleanup.push(() => touchQuery.removeEventListener('change', onMotionChange));

  const onPointerMove = (event: PointerEvent): void => {
    pendingX = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    pendingY = 1 - (event.clientY / Math.max(1, window.innerHeight)) * 2;
    if (pointerPending) return;
    pointerPending = true;
    requestAnimationFrame(() => {
      pointerPending = false;
      store.patch({ pointerX: pendingX, pointerY: pendingY });
    });
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  cleanup.push(() => window.removeEventListener('pointermove', onPointerMove));

  const onVisibility = (): void => {
    store.patch({ visible: !document.hidden });
    previousTime = 0;
  };
  document.addEventListener('visibilitychange', onVisibility);
  cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility));

  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      store.patch({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
      updateScroll(smoothScroll?.scroll ?? window.scrollY, 0);
      ScrollTrigger.refresh();
    }, 130);
  };
  window.addEventListener('resize', onResize, { passive: true });
  cleanup.push(() => { window.removeEventListener('resize', onResize); window.clearTimeout(resizeTimer); });

  for (const element of document.querySelectorAll<HTMLElement>('[data-chapter]')) {
    const chapter = element.dataset.chapter as ChapterId;
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top 58%',
      end: 'bottom 42%',
      onEnter: () => store.patch({ chapter }),
      onEnterBack: () => store.patch({ chapter })
    });
    chapterTriggers.push(trigger);
  }
  cleanup.push(() => chapterTriggers.forEach((trigger) => trigger.kill()));

  syncScrollMode();
  const onFontReady = (): void => ScrollTrigger.refresh();
  void document.fonts.ready.then(onFontReady).catch(() => undefined);
  updateScroll(window.scrollY, 0);

  return {
    scrollTo(target: string | number): void {
      if (typeof target === 'number') {
        const top = Number.isFinite(target) ? Math.max(0, target) : 0;
        if (smoothScroll) smoothScroll.scrollTo(top, { duration: store.snapshot.reducedMotion ? 0 : 1.1 });
        else window.scrollTo({ top, behavior: store.snapshot.reducedMotion ? 'instant' : 'smooth' });
        return;
      }
      if (!/^#[A-Za-z][\w-]*$/.test(target)) return;
      const destination = document.getElementById(target.slice(1));
      if (!destination) return;
      if (smoothScroll) smoothScroll.scrollTo(destination, { duration: store.snapshot.reducedMotion ? 0 : 1.1 });
      else destination.scrollIntoView({ behavior: store.snapshot.reducedMotion ? 'instant' : 'smooth' });
    },
    destroy(): void {
      stopSmoothScroll();
      for (const release of cleanup.reverse()) release();
    }
  };
}
