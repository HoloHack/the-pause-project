precision highp float;

attribute vec4 aParticle; // xyz: origin, w: random phase
attribute vec2 aParams;   // speed, width scale

uniform float uTime;
uniform float uWarp;
uniform float uIntensity;
uniform vec2 uPointer;
uniform float uAspect;

varying vec2 vQuadUv;
varying float vOpacity;
varying float vHead;

void main() {
  const float DEPTH = 32.0;
  float randomPhase = aParticle.w;
  float flowSpeed = (0.40 + aParams.x * 0.60) * (0.42 + 8.2 * uWarp);
  float z = -31.0 + mod(aParticle.z + uTime * flowSpeed, DEPTH);
  vec2 xy = aParticle.xy;

  // Soft gravitational well in XY, falling away smoothly with distance.
  vec2 pointerWorld = uPointer * vec2(4.4 * uAspect, 3.1);
  vec2 toWell = pointerWorld - xy;
  float distanceToWell = length(toWell);
  float well = exp(-distanceToWell * distanceToWell * 0.34) * (0.20 + uWarp * 0.20);
  xy += toWell * well;

  // Flow direction fans out from a gentle vanishing point near the centre.
  vec2 radial = normalize(xy + vec2(0.0001, 0.0002));
  vec2 tangent = vec2(-radial.y, radial.x);
  float nearWeight = smoothstep(-23.0, 0.0, z);
  float width = (0.008 + 0.014 * aParams.y) * (0.45 + nearWeight * 0.70);
  float lengthUnit = width * (1.6 + uWarp * (12.0 + 5.0 * aParams.x));
  vec2 screenOffset = tangent * position.x * width + radial * position.y * lengthUnit;

  vec4 center = modelViewMatrix * vec4(xy, z, 1.0);
  center.xy += screenOffset;
  gl_Position = projectionMatrix * center;

  vQuadUv = uv;
  float twinkle = 0.62 + 0.38 * sin(uTime * (0.55 + aParams.x) + randomPhase * 6.283185);
  float farFade = smoothstep(-31.0, -23.0, z);
  float nearFade = 1.0 - smoothstep(-4.0, 1.0, z);
  vOpacity = uIntensity * twinkle * farFade * nearFade * (0.22 + 0.65 * nearWeight);
  vHead = uWarp;
}
