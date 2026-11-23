import * as THREE from 'three';
import originalNoise4D from './shaders/noise4d.glsl?raw';
import rawArtifactVertex from './shaders/artifact.vert.glsl?raw';
import artifactFragment from './shaders/artifact.frag.glsl?raw';
import type { QualityLevel } from '../core/state';

export interface Artifact {
  readonly group: THREE.Group;
  readonly uniforms: {
    uTime: { value: number };
    uMorph: { value: number };
    uPulse: { value: number };
    uPointer: { value: THREE.Vector2 };
    uOpacity: { value: number };
    uAccent: { value: THREE.Color };
    uMist: { value: THREE.Color };
  };
  dispose(): void;
}

const artifactVertex = rawArtifactVertex.replace('#include "./noise4d.glsl"', originalNoise4D);

export function createArtifact(quality: Exclude<QualityLevel, 'static'>): Artifact {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uPulse: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: 1 },
    uAccent: { value: new THREE.Color('#ffaa75') },
    uMist: { value: new THREE.Color('#a9b6c2') }
  };

  const geometryDetail = quality === 'high' ? [76, 56] : quality === 'balanced' ? [52, 36] : [28, 20];
  const glassGeometry = new THREE.SphereGeometry(1.43, geometryDetail[0], geometryDetail[1]);
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: artifactVertex,
    fragmentShader: artifactFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide
  });
  const shell = new THREE.Mesh(glassGeometry, glassMaterial);
  shell.renderOrder = 6;
  shell.layers.enable(1); // Dedicated selective-bloom layer.
  group.add(shell);

  // The back-facing crystalline contour gives volume without post-processing.
  const backMaterial = glassMaterial.clone();
  backMaterial.uniforms = uniforms;
  backMaterial.side = THREE.BackSide;
  backMaterial.blending = THREE.AdditiveBlending;
  backMaterial.depthWrite = false;
  const backShell = new THREE.Mesh(glassGeometry, backMaterial);
  backShell.renderOrder = 3;
  backShell.layers.enable(1);
  group.add(backShell);

  const pauseMaterial = new THREE.MeshBasicMaterial({
    color: '#ffddca',
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });
  const barGeometry = new THREE.CapsuleGeometry(0.115, 0.72, 6, 12);
  for (const x of [-0.265, 0.265]) {
    const bar = new THREE.Mesh(barGeometry, pauseMaterial);
    bar.position.set(x, 0, -0.22);
    bar.rotation.z = -0.12;
    bar.renderOrder = 5;
    bar.layers.enable(1);
    group.add(bar);
  }

  const ringGeometry = new THREE.TorusGeometry(1.91, 0.0045, 3, 128);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#a9b6c2',
    transparent: true,
    opacity: 0.21,
    depthWrite: false
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.set(0.32 + i * 0.63, i * 1.18, i * 0.64);
    ring.renderOrder = 2;
    group.add(ring);
  }

  return {
    group,
    uniforms,
    dispose(): void {
      glassGeometry.dispose();
      glassMaterial.dispose();
      backMaterial.dispose();
      pauseMaterial.dispose();
      barGeometry.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      group.clear();
    }
  };
}
