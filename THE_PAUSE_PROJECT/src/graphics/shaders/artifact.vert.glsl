precision highp float;

uniform float uTime;
uniform float uMorph;
uniform float uPulse;
uniform vec2 uPointer;

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;
varying float vNoise;
varying float vRipple;
varying float vMorph;

#include "./noise4d.glsl"

void main() {
  vec3 p = position;
  vec3 direction = normalize(p);
  float noiseBase = noise4D(vec4(p * 1.13, uTime * 0.13));
  float noiseDetail = noise4D(vec4(p * 2.28 + 7.1, uTime * 0.21));
  float turbulence = noiseBase * 0.79 + noiseDetail * 0.21;

  // Pointer direction is converted to a smooth spherical angular ripple.
  vec3 touchDirection = normalize(vec3(uPointer.x * 1.17, uPointer.y * 1.17, 1.35));
  float angle = acos(clamp(dot(direction, touchDirection), -1.0, 1.0));
  float ripple = sin(angle * 17.0 - uTime * 4.1) * exp(-angle * 4.0);

  // Narrative morphs progress from unstable to composed. No CPU geometry
  // regeneration: all displacement is evaluated on the GPU each frame.
  float disruption = smoothstep(0.18, 1.1, uMorph) *
    (1.0 - smoothstep(2.05, 3.25, uMorph));
  float resolve = smoothstep(2.2, 3.85, uMorph);
  float shear = disruption * sin(p.y * 5.6 + uTime * 0.6) * 0.12;
  vec3 shifted = p + vec3(shear, 0.0, 0.0);
  float displacement = turbulence * mix(0.135, 0.28, disruption) *
    (1.0 - resolve * 0.62) + ripple * (0.045 + uPulse * 0.08);
  vec3 displaced = shifted + direction * displacement;
  displaced.y *= mix(1.0, 1.11, resolve);
  displaced.x *= mix(1.0, 0.86, resolve);

  // Analytic base normal is stable under all deformations and inexpensive.
  // Phase 3 can replace it with a finite-difference normal for close-ups.
  vec3 approxNormal = normalize(direction + vec3(shear * 0.09, -shear * 0.035, 0.0));
  vViewNormal = normalize(normalMatrix * approxNormal);
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = viewPosition.xyz;
  vLocalPosition = displaced;
  vNoise = turbulence;
  vRipple = ripple;
  vMorph = uMorph;
  gl_Position = projectionMatrix * viewPosition;
}
