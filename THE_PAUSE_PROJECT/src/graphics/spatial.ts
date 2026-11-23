import * as THREE from 'three';
import type { ChapterId, ExperienceState, ExperienceStore, QualityLevel } from '../core/state';
import { createArtifact, type Artifact } from './artifact';
import { createParticleField, type ParticleField } from './particles';
import { createCameraJourney } from './camera';
import { createOpticalPipeline, type OpticalPipeline } from './postprocessing';

export interface SpatialExperience {
  readonly available: boolean;
  destroy(): void;
}

type GpuTimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
const MORPH_STATES: Record<ChapterId, number> = {
  threshold: 0, recognise: 1, intervene: 2, support: 3, outro: 4
};
const limited = (v: number, lower: number, upper: number): number => Math.min(upper, Math.max(lower, v));
const smooth = (current: number, target: number, delta: number, damping: number): number =>
  current + (target - current) * (1 - Math.exp(-damping * delta));

/**
 * Phase 3 owns the ONE Three.js renderer for all chapters, with two composers
 * only for independent selective bloom and final optical output. It never
 * creates another ticker/RAF or a second WebGL context.
 */
export function createSpatialExperience(store: ExperienceStore): SpatialExperience {
  const stage = document.querySelector<HTMLElement>('.hero-stage');
  const site = document.querySelector<HTMLElement>('#app');
  const backdrop = document.querySelector<HTMLElement>('#spatial-backdrop');
  const canvas = document.querySelector<HTMLCanvasElement>('#spatial-scene');
  if (!stage || !site || !backdrop || !canvas || store.snapshot.quality === 'static') {
    return { available: false, destroy() {} };
  }

  let renderer: THREE.WebGLRenderer;
  let context: WebGL2RenderingContext | null = null;
  try {
    context = canvas.getContext('webgl2', {
      alpha: true, depth: true, stencil: false, antialias: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false
    });
    if (!context) throw new Error('WebGL2 is unavailable');
    renderer = new THREE.WebGLRenderer({
      canvas, context, alpha: true, antialias: false, depth: true,
      stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch (error) {
    console.warn('WebGL setup unavailable; semantic illustration remains accessible.', error);
    stage.classList.add('spatial-fallback');
    return { available: false, destroy() {} };
  }

  const gl = context!;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as GpuTimerExtension | null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 90);
  camera.position.set(0, 0, 7.7);
  camera.layers.enable(1); // Normal render includes both ordinary and bloom-tagged meshes.
  const rig = new THREE.Group();
  scene.add(rig);
  const journey = createCameraJourney(camera, store);
  let artifact: Artifact | null = null;
  let particles: ParticleField | null = null;
  let optical: OpticalPipeline | null = null;
  let activeQuality: QualityLevel = store.snapshot.quality;
  let elapsed = 0;
  let morph = 0;
  let warp = 0;
  let pulse = 0;
  let lost = false;
  let destroyed = false;
  let firstFrame = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastDpr = 0;
  let resizeTimer = 0;
  let overBudgetFrames = 0;
  let lastQualityChange = -10;
  let drawCount = 0;
  let pendingQuery: WebGLQuery | null = null;
  let gpuOverBudgetSamples = 0;
  let lastGpuMs: number | null = null;

  function setFallback(active: boolean): void {
    stage!.classList.toggle('spatial-ready', !active);
    stage!.classList.toggle('spatial-fallback', active);
    site!.classList.toggle('spatial-active', !active);
    backdrop!.classList.toggle('spatial-visible', !active);
    canvas!.hidden = active;
  }

  function releaseGpuQuery(): void {
    if (pendingQuery && !lost) gl.deleteQuery(pendingQuery);
    pendingQuery = null;
  }

  function disposeOptics(): void {
    optical?.destroy();
    optical = null;
  }

  function disposeObjects(): void {
    if (artifact) {
      rig.remove(artifact.group);
      artifact.dispose();
      artifact = null;
    }
    if (particles) {
      rig.remove(particles.mesh);
      particles.dispose();
      particles = null;
    }
  }

  function configureQuality(level: QualityLevel): void {
    activeQuality = level;
    disposeOptics();
    disposeObjects();
    if (level === 'static') {
      setFallback(true);
      return;
    }
    try {
      artifact = createArtifact(level);
      particles = createParticleField(level);
      rig.add(particles.mesh, artifact.group);
      firstFrame = false;
      // Low tier retains one direct scene render. Other tiers use post FX.
      if (level !== 'low') {
        try {
          optical = createOpticalPipeline(renderer, scene, camera, level);
        } catch (error) {
          console.warn('Optical pipeline unavailable; direct scene rendering continues.', error);
          disposeOptics();
        }
      }
      // Keep the backing canvas renderable while the backdrop fades in.
      // Opacity (not display:none) hides it until a successful first frame.
      canvas!.hidden = false;
      lastWidth = 0;
      lastHeight = 0;
      lastDpr = 0;
      resizeNow();
    } catch (error) {
      console.warn('GPU scene creation failed; restoring semantic artwork.', error);
      disposeOptics();
      disposeObjects();
      activeQuality = 'static';
      setFallback(true);
      store.patch({ quality: 'static' });
    }
  }

  function resizeNow(): void {
    if (destroyed || lost || activeQuality === 'static') return;
    const width = Math.max(1, Math.round(window.innerWidth));
    const height = Math.max(1, Math.round(window.innerHeight));
    const tierDpr = activeQuality === 'high' ? 1.42 : activeQuality === 'balanced' ? 1.12 : 1;
    const maxPixels = activeQuality === 'high' ? 1_850_000 : activeQuality === 'balanced' ? 950_000 : 680_000;
    const dpr = Math.max(0.65, Math.min(window.devicePixelRatio || 1, tierDpr, Math.sqrt(maxPixels / (width * height))));
    if (width === lastWidth && height === lastHeight && Math.abs(dpr - lastDpr) < 0.01) return;
    lastWidth = width;
    lastHeight = height;
    lastDpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 630 ? 50 : 41;
    camera.updateProjectionMatrix();
    journey.resize(width, height);
    rig.position.set(width < 760 ? 0.15 : 1.4, width < 760 ? 0.45 : 0.35, 0);
    if (particles) particles.uniforms.uAspect.value = camera.aspect;
    artifact?.group.scale.setScalar(width < 630 ? 0.76 : 1);
    optical?.resize(width, height, dpr);
  }

  function onResize(): void {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeNow, 130);
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    lost = true;
    pendingQuery = null;
    setFallback(true);
  }

  function onContextRestored(): void {
    if (destroyed) return;
    try {
      lost = false;
      renderer.resetState();
      releaseGpuQuery();
      configureQuality(activeQuality);
      firstFrame = false;
    } catch (error) {
      console.warn('WebGL restoration unsuccessful; retaining static artwork.', error);
      lost = true;
      setFallback(true);
    }
  }

  function readGpuTimer(): void {
    if (!timer || !pendingQuery || lost) return;
    const available = gl.getQueryParameter(pendingQuery, gl.QUERY_RESULT_AVAILABLE) as boolean;
    if (!available) return;
    const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT) as boolean;
    if (!disjoint) {
      const nanoseconds = gl.getQueryParameter(pendingQuery, gl.QUERY_RESULT) as number;
      lastGpuMs = nanoseconds / 1_000_000;
      gpuOverBudgetSamples = lastGpuMs > 22 ? gpuOverBudgetSamples + 1 : Math.max(0, gpuOverBudgetSamples - 1);
    }
    releaseGpuQuery();
  }

  function renderScene(delta: number): void {
    // Offscreen timer query is optional and never blocks waiting for a result.
    readGpuTimer();
    let queryStarted = false;
    if (timer && !pendingQuery && drawCount % 48 === 0 && !lost) {
      const query = gl.createQuery();
      if (query) {
        pendingQuery = query;
        try {
          gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
          queryStarted = true;
        } catch {
          releaseGpuQuery();
        }
      }
    }
    try {
      if (optical) {
        try {
          optical.render(delta, elapsed, warp);
        } catch (error) {
          console.warn('Post-processing failed; rendering without optical passes.', error);
          disposeOptics();
          renderer.setRenderTarget(null);
          camera.layers.enable(1);
          renderer.render(scene, camera);
        }
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    } finally {
      if (queryStarted && timer && !lost) gl.endQuery(timer.TIME_ELAPSED_EXT);
    }
    drawCount++;
  }

  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);
  window.addEventListener('resize', onResize, { passive: true });

  const unsubscribeState = store.onChange(state => {
    if (destroyed) return;
    if (state.quality !== activeQuality) configureQuality(state.quality);
    if (state.reducedMotion && activeQuality !== 'static') {
      store.patch({ quality: 'static' });
    }
  });

  const unsubscribeFrame = store.onFrame((state: Readonly<ExperienceState>, dt) => {
    if (destroyed || lost || !state.visible || activeQuality === 'static' || !artifact || !particles) return;
    try {
      const delta = limited(dt, 0, 0.05);
      elapsed += delta;
      warp = smooth(warp, Math.min(1, Math.abs(state.velocityIntensity)), delta, 3.3);
      const heroMorph = Math.min(1.35, state.scrollY / Math.max(1, state.viewportHeight * 0.50));
      morph = smooth(morph, Math.max(MORPH_STATES[state.chapter], heroMorph), delta, 2.0);
      pulse = smooth(pulse, Math.abs(state.pointerX * state.pointerY) * 0.7, delta, 2.4);
      const pointerX = smooth(artifact.uniforms.uPointer.value.x, state.pointerX, delta, 5.5);
      const pointerY = smooth(artifact.uniforms.uPointer.value.y, state.pointerY, delta, 5.5);

      artifact.uniforms.uTime.value = elapsed;
      artifact.uniforms.uMorph.value = morph;
      artifact.uniforms.uPulse.value = pulse;
      artifact.uniforms.uPointer.value.set(pointerX, pointerY);
      artifact.uniforms.uOpacity.value = 1;
      artifact.group.rotation.y = smooth(artifact.group.rotation.y, state.pointerX * 0.17 + elapsed * 0.035, delta, 1.7);
      artifact.group.rotation.x = smooth(artifact.group.rotation.x, -state.pointerY * 0.12, delta, 1.7);
      artifact.group.position.y = Math.sin(elapsed * 0.31) * 0.07;

      particles.uniforms.uTime.value = elapsed;
      particles.uniforms.uWarp.value = warp;
      particles.uniforms.uPointer.value.set(pointerX, pointerY);
      particles.uniforms.uIntensity.value = 1;

      journey.update(delta);
      renderScene(delta);
      if (!firstFrame) {
        firstFrame = true;
        setFallback(false);
      }

      // The frame interval is a rough CPU heuristic; GPU timer samples (when
      // the extension exists) offer more reliable but still device-local data.
      if (delta > 0.029) overBudgetFrames++;
      else overBudgetFrames = Math.max(0, overBudgetFrames - 2);
      if ((overBudgetFrames >= 100 || gpuOverBudgetSamples >= 4) && elapsed - lastQualityChange > 7) {
        overBudgetFrames = 0;
        gpuOverBudgetSamples = 0;
        lastQualityChange = elapsed;
        const lower: QualityLevel = activeQuality === 'high' ? 'balanced' : 'low';
        if (lower !== activeQuality) store.patch({ quality: lower });
      }
      void lastGpuMs; // Last GPU result retained for a future Phase 5 QA overlay.
    } catch (error) {
      console.warn('Spatial render failed; reverting to accessible artwork.', error);
      setFallback(true);
      store.patch({ quality: 'static' });
    }
  });

  setFallback(true);
  configureQuality(activeQuality);

  return {
    available: activeQuality !== 'static',
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeFrame();
      unsubscribeState();
      journey.destroy();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      setFallback(true);
      releaseGpuQuery();
      disposeOptics();
      disposeObjects();
      scene.clear();
      renderer.dispose();
    }
  };
}
