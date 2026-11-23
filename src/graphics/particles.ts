import * as THREE from 'three';
import particleVertex from './shaders/particles.vert.glsl?raw';
import particleFragment from './shaders/particles.frag.glsl?raw';
import type { QualityLevel } from '../core/state';

export const PARTICLE_COUNTS = {
  high: 65536,
  balanced: 24576,
  low: 8192,
  static: 0
} as const satisfies Record<QualityLevel, number>;

export interface ParticleField {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  readonly count: number;
  readonly uniforms: {
    uTime: { value: number };
    uWarp: { value: number };
    uIntensity: { value: number };
    uPointer: { value: THREE.Vector2 };
    uAspect: { value: number };
    uAccent: { value: THREE.Color };
    uMist: { value: THREE.Color };
  };
  dispose(): void;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One instanced triangle-strip-equivalent field, not thousands of Meshes. */
export function createParticleField(quality: Exclude<QualityLevel, 'static'>): ParticleField {
  const count = PARTICLE_COUNTS[quality];
  const particleData = new Float32Array(count * 4);
  const particleParams = new Float32Array(count * 2);
  const random = seededRandom(0x135ac021);

  for (let i = 0; i < count; i++) {
    const i4 = i * 4;
    const i2 = i * 2;
    const distance = Math.sqrt(random());
    const angle = random() * 2 * Math.PI;
    particleData[i4] = Math.cos(angle) * distance * 7.9;
    particleData[i4 + 1] = Math.sin(angle) * distance * 5.2;
    particleData[i4 + 2] = random() * 32.0;
    particleData[i4 + 3] = random();
    particleParams[i2] = 0.35 + 0.65 * random();
    particleParams[i2 + 1] = 0.24 + 0.76 * random();
  }

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, -0.5, 0,
     0.5, -0.5, 0,
     0.5,  0.5, 0,
    -0.5,  0.5, 0
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 1, 1, 0, 1
  ], 2));
  geometry.setAttribute('aParticle', new THREE.InstancedBufferAttribute(particleData, 4));
  geometry.setAttribute('aParams', new THREE.InstancedBufferAttribute(particleParams, 2));
  geometry.instanceCount = count;
  // The particles wrap within a bounded Z-volume. This conservative bound
  // supports THREE's whole-field frustum culling without clipping near edges.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -15), 37);

  const uniforms = {
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uIntensity: { value: 1 },
    uPointer: { value: new THREE.Vector2() },
    uAspect: { value: 1 },
    uAccent: { value: new THREE.Color('#ffaa75') },
    uMist: { value: new THREE.Color('#a9b6c2') }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = true;
  mesh.renderOrder = 1;

  return {
    mesh,
    uniforms,
    count,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    }
  };
}
