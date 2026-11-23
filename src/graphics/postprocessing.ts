import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import fragmentShader from './shaders/optical.frag.glsl?raw';
import type { QualityLevel } from '../core/state';

export const BLOOM_LAYER = 1;

export interface OpticalPipeline {
  resize(width: number, height: number, dpr: number): void;
  render(deltaSeconds: number, time: number, velocity: number): void;
  destroy(): void;
}

/**
 * Selective glow: only objects explicitly enabled on BLOOM_LAYER appear in
 * the bloom-only RenderPass. The normal camera still sees layer 0 + 1.
 * The second composer adds that bloom texture to a full scene render before
 * applying optical colour separation and one-pass film finishing.
 */
export function createOpticalPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  quality: Exclude<QualityLevel, 'static'>
): OpticalPipeline {
  const fullScene = new RenderPass(scene, camera);
  const bloomScene = new RenderPass(scene, camera);
  const isHigh = quality === 'high';
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    isHigh ? 0.68 : 0.44,
    isHigh ? 0.52 : 0.36,
    0.17
  );
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(bloomScene);
  bloomComposer.addPass(bloomPass);
  // UnrealBloomPass composites its mip chain into its own first horizontal
  // target before additively blending back into the source. Sampling that
  // intermediate is truly bloom-only and avoids doubling the original shell.
  const bloomTexture = bloomPass.renderTargetsHorizontal[0]?.texture;
  if (!bloomTexture) throw new Error('Bloom composite target is unavailable');

  const uniforms = {
    tDiffuse: { value: null as THREE.Texture | null },
    uBloom: { value: bloomTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVelocity: { value: 0 },
    uTime: { value: 0 },
    uFocus: { value: isHigh ? 1.0 : 0.30 },
    uBloomStrength: { value: isHigh ? 0.76 : 0.56 }
  };
  const optics = new ShaderPass({
    uniforms,
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader
  });
  const outputPass = new OutputPass();
  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(fullScene);
  finalComposer.addPass(optics);
  finalComposer.addPass(outputPass);

  let disposed = false;
  let width = 1;
  let height = 1;
  let currentDpr = 1;
  return {
    resize(nextWidth, nextHeight, nextDpr) {
      if (disposed) return;
      width = Math.max(1, Math.round(nextWidth));
      height = Math.max(1, Math.round(nextHeight));
      currentDpr = Math.max(0.5, nextDpr);
      bloomComposer.setPixelRatio(currentDpr);
      finalComposer.setPixelRatio(currentDpr);
      bloomComposer.setSize(width, height);
      finalComposer.setSize(width, height);
      optics.uniforms['uResolution']!.value.set(width * currentDpr, height * currentDpr);
    },
    render(deltaSeconds, time, velocity) {
      if (disposed) return;
      const savedMask = camera.layers.mask;
      // Particle mesh uses only layer 0; shell and luminous bars include 1.
      camera.layers.set(BLOOM_LAYER);
      try {
        bloomComposer.render(deltaSeconds);
      } finally {
        camera.layers.mask = savedMask;
      }
      optics.uniforms['uVelocity']!.value = THREE.MathUtils.clamp(velocity, 0, 1);
      optics.uniforms['uTime']!.value = time;
      finalComposer.render(deltaSeconds);
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      bloomComposer.dispose();
      finalComposer.dispose();
      bloomPass.dispose();
      optics.dispose();
      outputPass.dispose();
    }
  };
}
