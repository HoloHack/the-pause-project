import type { ExperienceStore } from './state';

export interface KineticInterface { destroy(): void }
const lerp = (current: number, target: number, decay: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-decay * dt));

/** Single physics controller piggybacks on the GSAP frame ticker. */
export function createKineticInterface(store: ExperienceStore): KineticInterface {
  const cursor = document.querySelector<HTMLElement>('#magnetic-reticle');
  const cursorLabel = document.querySelector<HTMLElement>('#reticle-label');
  const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-kinetic]'));
  const targets = 'a, button, [role="tab"], [data-cursor]';
  const enabledPointer = window.matchMedia('(pointer: fine) and (hover: hover)');
  let realX = window.innerWidth * 0.5;
  let realY = window.innerHeight * 0.5;
  let shownX = realX;
  let shownY = realY;
  let hasPointer = false;
  let activeElement: HTMLElement | null = null;
  let momentum = 0;

  const isEnabled = (): boolean => enabledPointer.matches && !store.snapshot.reducedMotion;
  const labelFor = (target: HTMLElement): string => {
    const explicit = target.closest<HTMLElement>('[data-cursor]')?.dataset.cursor;
    if (explicit && /^(DRAG|EXPLORE|ENTER|PAUSE|READ|CHOOSE)$/.test(explicit)) return explicit;
    if (target.closest('button')) return 'CHOOSE';
    return 'ENTER';
  };
  const onMove = (event: PointerEvent): void => {
    realX = event.clientX;
    realY = event.clientY;
    hasPointer = true;
    if (cursor && isEnabled()) cursor.classList.add('visible');
    const hovered = document.elementFromPoint(realX, realY)?.closest<HTMLElement>(targets) ?? null;
    if (hovered !== activeElement) {
      activeElement = hovered;
      if (cursor) cursor.classList.toggle('engaged', Boolean(hovered));
      if (cursorLabel) cursorLabel.textContent = hovered ? labelFor(hovered) : '•';
    }
  };
  const onOut = (event: PointerEvent): void => {
    if (event.relatedTarget === null) { hasPointer = false; cursor?.classList.remove('visible'); }
  };
  const onPointerDown = (): void => cursor?.classList.add('pressed');
  const onPointerUp = (): void => cursor?.classList.remove('pressed');
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  const unsubscribe = store.onFrame((state, dt) => {
    if (isEnabled() && cursor && hasPointer) {
      let x = realX;
      let y = realY;
      if (activeElement) {
        const r = activeElement.getBoundingClientRect();
        const centerX = r.left + r.width / 2;
        const centerY = r.top + r.height / 2;
        const distance = Math.hypot(realX - centerX, realY - centerY);
        if (distance < Math.min(125, Math.max(r.width, r.height))) {
          x = realX * 0.72 + centerX * 0.28;
          y = realY * 0.72 + centerY * 0.28;
        }
      }
      shownX = lerp(shownX, x, 13, dt);
      shownY = lerp(shownY, y, 13, dt);
      cursor.style.transform = `translate3d(${shownX.toFixed(1)}px, ${shownY.toFixed(1)}px, 0) translate(-50%, -50%)`;
    } else cursor?.classList.remove('visible');
    momentum = lerp(momentum, Math.max(-1, Math.min(1, state.scrollVelocity / 24)), 8, dt);
    if (state.reducedMotion) momentum = 0;
    const skew = (momentum * -2.8).toFixed(2);
    for (const heading of headings) {
      if (!state.reducedMotion) {
        const bounds = heading.getBoundingClientRect();
        if (bounds.bottom > -100 && bounds.top < window.innerHeight + 100) {
          heading.style.transform = `skewY(${skew}deg) translate3d(0, ${Math.abs(momentum * 4).toFixed(2)}px, 0)`;
        }
      } else heading.style.transform = '';
    }
  });
  return { destroy(): void {
    unsubscribe();
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointerup', onPointerUp);
    for (const heading of headings) heading.style.transform = '';
    cursor?.remove();
  } };
}
