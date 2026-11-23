import { gsap } from 'gsap';
import type { ExperienceStore, ExperienceState, PortalId } from './state';
import type { ExperienceRuntime } from './experience';

export interface PortalNavigation { destroy(): void }
const validTargets = new Set(['top', 'recognise', 'intervene', 'support', 'outro']);
const portalIds: Partial<Record<string, PortalId>> = {
  recognise: 'recognise', intervene: 'intervene', support: 'support'
};

/** One portal controller for both the semantic chapter menu and spatial travel.
 * Focus management and reduced-motion navigation work without WebGL.
 */
export function createPortalNavigation(store: ExperienceStore, runtime: ExperienceRuntime): PortalNavigation {
  const menu = document.querySelector<HTMLDialogElement>('#chapter-menu');
  const open = document.querySelector<HTMLButtonElement>('#menu-open');
  const openSecondary = document.querySelector<HTMLButtonElement>('#menu-open-secondary');
  const close = document.querySelector<HTMLButtonElement>('#menu-close');
  const veil = document.querySelector<HTMLElement>('#portal-veil');
  const status = document.querySelector<HTMLElement>('#portal-status');
  const active = document.querySelector<HTMLElement>('#chapter-launcher-label');
  const site = document.querySelector<HTMLElement>('#app');
  const targets = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-portal]'));
  const removers: Array<() => void> = [];
  let transitioning = false;
  let pendingTween: gsap.core.Timeline | null = null;
  let lastActive: Element | null = null;
    let destroyed = false;

  const bind = (target: EventTarget | null, type: string, fn: EventListener): void => {
    target?.addEventListener(type, fn);
    removers.push(() => target?.removeEventListener(type, fn));
  };

  const dismiss = (): void => {
    if (!menu?.open) return;
    try { menu.close(); } catch { menu.removeAttribute('open'); }
    open?.setAttribute('aria-expanded', 'false');
    openSecondary?.setAttribute('aria-expanded', 'false');
    const focus = lastActive instanceof HTMLElement ? lastActive : open;
    focus?.focus({ preventScroll: true });
  };
  const show = (): void => {
    if (!menu || menu.open) return;
    lastActive = document.activeElement;
    try { menu.showModal(); } catch { menu.setAttribute('open', ''); }
    open?.setAttribute('aria-expanded', 'true');
    openSecondary?.setAttribute('aria-expanded', 'true');
    close?.focus({ preventScroll: true });
  };
  bind(open, 'click', () => menu?.open ? dismiss() : show());
  bind(openSecondary, 'click', () => menu?.open ? dismiss() : show());
  bind(close, 'click', dismiss);
  bind(menu, 'close', () => { open?.setAttribute('aria-expanded', 'false'); openSecondary?.setAttribute('aria-expanded', 'false'); });
  bind(menu, 'click', (ev) => { if (ev.target === menu) dismiss(); });

  function navigate(id: string): void {
    if (!validTargets.has(id) || transitioning || destroyed) return;
    const destination = document.getElementById(id);
    if (!destination) return;
    dismiss();
    const path = `#${id}`;
    const go = (): void => {
      if (destroyed) return;
      history.replaceState(null, '', path);
      runtime.scrollTo(path);
      destination.focus({ preventScroll: true });
      if (status) status.textContent = `Entering ${id === 'top' ? 'the beginning' : id} chapter.`;
    };
    const portal = portalIds[id] ?? 'closed';
    if (store.snapshot.reducedMotion || !veil) {
      go();
      store.patch({ portal: 'closed' });
      return;
    }
    transitioning = true;
    store.patch({ portal });
    veil.setAttribute('aria-hidden', 'true');
    pendingTween?.kill();
    pendingTween = gsap.timeline({
      onComplete: () => {
        transitioning = false;
        store.patch({ portal: 'closed' });
      }
    });
    pendingTween.set(veil, { display: 'grid', autoAlpha: 0, scale: 0.84 });
    pendingTween.to(veil, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.inOut', onComplete: go });
    pendingTween.to(veil, { autoAlpha: 0, scale: 1.18, duration: 0.65, ease: 'power3.out', delay: 0.06 });
    pendingTween.set(veil, { display: 'none' });
  }

  for (const link of targets) bind(link, 'click', (ev) => {
    const click = ev as MouseEvent;
    if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey || click.button !== 0) return;
    const href = link.getAttribute('href') || '';
    if (!/^#[A-Za-z][\w-]*$/.test(href)) return;
    if (!validTargets.has(href.slice(1))) return;
    click.preventDefault();
    navigate(href.slice(1));
  });

  const refreshChapter = (state: Readonly<ExperienceState>): void => {
    site?.setAttribute('data-current-chapter', state.chapter);
    const label = state.chapter === 'threshold' ? '00 / BEGIN' :
      state.chapter === 'outro' ? '04 / PLEDGE' :
      `${({ recognise: '01', intervene: '02', support: '03' } as Record<string, string>)[state.chapter] ?? '00'} / ${state.chapter.toUpperCase()}`;
    if (active && active.textContent !== label) active.textContent = label;
    for (const link of targets) {
      if (link.closest('#chapter-menu')) link.setAttribute('aria-current', link.hash.slice(1) === (state.chapter === 'threshold' ? 'top' : state.chapter) ? 'location' : 'false');
    }
  };
  const unsubscribe = store.onChange(refreshChapter);
  refreshChapter(store.snapshot);
  // Use a single RAF for cursor highlights; never trigger layout work on every pointer event.
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-specular]'));
  let pending: { panel: HTMLElement; x: number; y: number } | null = null;
  let raf = 0;
  const onPointer = (event: Event): void => {
    const e = event as PointerEvent;
    const panel = (e.target instanceof Element ? e.target.closest<HTMLElement>('[data-specular]') : null);
    if (!panel || store.snapshot.reducedMotion || window.matchMedia('(pointer: coarse)').matches) return;
    const rect = panel.getBoundingClientRect();
    pending = { panel, x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100 };
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!pending) return;
      pending.panel.style.setProperty('--spot-x', `${Math.max(0, Math.min(100, pending.x)).toFixed(1)}%`);
      pending.panel.style.setProperty('--spot-y', `${Math.max(0, Math.min(100, pending.y)).toFixed(1)}%`);
      pending = null;
    });
  };
  bind(document, 'pointermove', onPointer);

  // Source photography remains readable without CSS or network; this controller
  // progressively adds soft vertical parallax on non-touch devices only.
  let parallaxScheduled = false;
  const pictures = Array.from(document.querySelectorAll<HTMLImageElement>('[data-parallax]'));
  const syncParallax = (): void => {
    parallaxScheduled = false;
    if (store.snapshot.reducedMotion || window.matchMedia('(pointer: coarse)').matches) return;
    for (const photo of pictures) {
      const rect = photo.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > innerHeight + 120) continue;
      const shift = Math.max(-24, Math.min(24, (innerHeight / 2 - (rect.top + rect.height / 2)) * 0.052));
      photo.style.setProperty('--parallax-y', `${shift.toFixed(1)}px`);
    }
  };
  const onScroll = (): void => {
    if (parallaxScheduled) return;
    parallaxScheduled = true;
    requestAnimationFrame(syncParallax);
  };
  bind(window, 'scroll', onScroll);
  bind(window, 'resize', onScroll);
  onScroll();

  // Image fallbacks are local original artwork; do not use inline onerror handlers.
  for (const photo of document.querySelectorAll<HTMLImageElement>('img[data-local-fallback]')) {
    const handler = (): void => {
      if (photo.dataset.fallbackApplied === 'true') return;
      const fallback = photo.dataset.localFallback;
      if (!fallback || !/^\.\/images\/[a-z0-9-]+\.webp$/.test(fallback)) return;
      photo.dataset.fallbackApplied = 'true';
      photo.src = fallback;
      photo.alt = `${photo.alt} (local editorial illustration used because the photograph is unavailable)`;
    };
    bind(photo, 'error', handler);
  }

  return {
    destroy(): void {
      destroyed = true;
      pendingTween?.kill();
      if (raf) cancelAnimationFrame(raf);
      unsubscribe();
      for (const release of removers) release();
      for (const panel of panels) {
        panel.style.removeProperty('--spot-x');
        panel.style.removeProperty('--spot-y');
      }
      dismiss();
    }
  };
}
