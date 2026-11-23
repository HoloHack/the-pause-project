import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ExperienceStore } from '../core/state';

export interface CameraJourney {
  update(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

const clamp = (n: number, min = 0, max = 1): number => Math.max(min, Math.min(max, n));
const ease = (t: number): number => t * t * (3 - 2 * t);

/**
 * A single chapter-spanning ScrollTrigger controls an arc-length sampled
 * Catmull-Rom flight curve. Lenis updates ScrollTrigger in the Phase 1 runtime.
 * This component only samples the existing GSAP ticker, never starts a RAF.
 */
export function createCameraJourney(camera: THREE.PerspectiveCamera, store: ExperienceStore): CameraJourney {
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 7.7),
    new THREE.Vector3(1.15, 0.12, 6.2),
    new THREE.Vector3(2.7, 0.4, 4.8),
    new THREE.Vector3(0.25, -0.35, 3.75),
    new THREE.Vector3(-2.55, -0.1, 4.6),
    new THREE.Vector3(-0.7, 0.35, 5.4),
    new THREE.Vector3(0, 0.0, 7.7)
  ], false, 'catmullrom', 0.48);
  const sceneTarget = new THREE.Vector3();
  const currentLook = new THREE.Vector3();
  const currentPosition = new THREE.Vector3();
  const tmpPosition = new THREE.Vector3();
  const chapterIds = ['top', 'recognise', 'intervene', 'support', 'outro'] as const;
  let anchors = [0, 0.25, 0.5, 0.75, 1];
  let desiredProgress = clamp(store.snapshot.scrollProgress);
  let smoothProgress = desiredProgress;
  let width = Math.max(1, store.snapshot.viewportWidth);
  let height = Math.max(1, store.snapshot.viewportHeight);
  let destroyed = false;
  let portalDepth = 0;

  function measureAnchors(): void {
    const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const raw = chapterIds.map((id, index) => {
      const section = document.getElementById(id);
      if (!section) return index / (chapterIds.length - 1);
      const top = section.getBoundingClientRect().top + window.scrollY;
      const anchor = id === 'top' ? top : top + Math.min(section.clientHeight * 0.32, window.innerHeight * 0.48);
      return clamp(anchor / available);
    });
    anchors = raw.map((value, index) => index === 0 ? 0 : Math.max(raw[index - 1] ?? 0, value));
    anchors[anchors.length - 1] = 1;
  }

  function mappedProgress(documentProgress: number): number {
    const p = clamp(documentProgress);
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i] ?? 0;
      const b = anchors[i + 1] ?? 1;
      if (p <= b || i === anchors.length - 2) {
        const fraction = clamp((p - a) / Math.max(0.0001, b - a));
        return (i + ease(fraction)) / (anchors.length - 1);
      }
    }
    return 1;
  }

  measureAnchors();
  const story = document.getElementById('story');
  const trigger = story ? ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onRefresh(self) {
      measureAnchors();
      desiredProgress = clamp(self.progress);
    },
    onUpdate(self) { desiredProgress = clamp(self.progress); }
  }) : null;

  const unsubscribe = store.onChange(state => {
    // The GSAP trigger is authoritative, but the store is a fallback for
    // reduced-motion/native keyboard navigation and initial restoration.
    if (!trigger) desiredProgress = clamp(state.scrollProgress);
  });

  function updateCamera(dt: number, immediately = false): void {
    if (destroyed) return;
    if (store.snapshot.reducedMotion) desiredProgress = store.snapshot.scrollProgress;
    const target = mappedProgress(desiredProgress);
    const lambda = 1 - Math.exp(-Math.max(0, dt) * 5.8);
    smoothProgress = immediately || store.snapshot.reducedMotion
      ? target : THREE.MathUtils.lerp(smoothProgress, target, lambda);
    portalDepth = THREE.MathUtils.damp(portalDepth, store.snapshot.portal === 'closed' ? 0 : 1, 8, Math.max(dt, 0.001));
    const t = clamp(smoothProgress);
    // getPointAt samples the curve at approximately equal spatial distances.
    path.getPointAt(t, tmpPosition);
    const mobile = width < 760;
    const horizontalOffset = mobile ? 0.28 : 0.38;
    tmpPosition.x += horizontalOffset;
    tmpPosition.y += mobile ? 0.14 : 0.07;
    tmpPosition.z -= portalDepth * (mobile ? 0.28 : 0.64);
    const damp = immediately || store.snapshot.reducedMotion ? 1 : lambda;
    currentPosition.lerp(tmpPosition, damp);
    sceneTarget.set(mobile ? 0.15 : 0.4, 0, 0);
    // A little scroll-dependent yaw keeps the object in view across flights.
    sceneTarget.x += Math.sin(t * Math.PI * 4) * 0.14;
    currentLook.lerp(sceneTarget, damp);
    camera.position.copy(currentPosition);
    camera.lookAt(currentLook);
  }

  path.getPointAt(mappedProgress(desiredProgress), currentPosition);
  currentLook.set(0, 0, 0);
  updateCamera(0, true);

  return {
    update(deltaSeconds) { updateCamera(deltaSeconds); },
    resize(nextWidth, nextHeight) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      void height;
      measureAnchors();
    },
    destroy() {
      destroyed = true;
      trigger?.kill();
      unsubscribe();
    }
  };
}
