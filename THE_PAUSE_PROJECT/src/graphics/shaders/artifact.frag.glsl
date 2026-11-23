precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform vec3 uAccent;
uniform vec3 uMist;

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;
varying float vNoise;
varying float vRipple;
varying float vMorph;

void main() {
  vec3 N = normalize(vViewNormal);
  vec3 V = normalize(-vViewPosition);
  vec3 L = normalize(vec3(-0.56, 0.75, 0.56));

  // An optical approximation: procedural reflection/refraction directions
  // sample an analytic environment, NOT a framebuffer or ray-traced scene.
  vec3 reflected = reflect(-V, N);
  vec3 refracted = refract(-V, N, 1.0 / 1.19);
  float envStripe = pow(max(0.0, dot(reflected, normalize(vec3(0.6, 0.4, 0.69)))), 7.0);
  float envSoft = 0.5 + 0.5 * sin(refracted.y * 9.0 + refracted.x * 3.2);
  float diffuse = 0.35 + max(0.0, dot(N, L)) * 0.65;

  float nv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - nv, 3.3);
  float filmPhase = 13.5 * nv + 3.9 * vNoise + vLocalPosition.y * 1.9 + uTime * 0.08;
  vec3 interference = 0.5 + 0.5 * cos(filmPhase + vec3(0.0, 2.094395, 4.188790));

  // Approximate subsurface light wrapping/transmission through a thin shell.
  float wrapLight = clamp((dot(N, L) + 0.55) / 1.55, 0.0, 1.0);
  float transmission = pow(max(0.0, dot(-N, L)), 1.6) * (1.0 - fresnel);
  vec3 scattered = uAccent * (0.08 + 0.24 * wrapLight + 0.18 * transmission);

  vec3 glass = mix(uMist * 0.23, uAccent * 0.30, envSoft) + scattered;
  glass += interference * (0.13 + 0.43 * fresnel);
  glass += uMist * pow(fresnel, 0.54) * 0.78;
  glass += vec3(1.0, 0.85, 0.73) * envStripe * 0.62;
  glass += uAccent * abs(vRipple) * 0.14;
  glass *= 0.87 + 0.28 * diffuse;

  float calm = smoothstep(2.2, 3.8, vMorph);
  glass = mix(glass, mix(glass, uMist * 0.44 + uAccent * 0.22, 0.3), calm);
  float alpha = (0.45 + 0.46 * fresnel + 0.10 * envStripe) * uOpacity;
  gl_FragColor = vec4(glass, clamp(alpha, 0.0, 0.98));
}
