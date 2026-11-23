precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform float uVelocity;
uniform float uTime;
uniform float uFocus;
uniform float uBloomStrength;
varying vec2 vUv;

float rand(vec2 p) {
  // Stable screen-space film grain; one hash per fragment, not an SVG filter.
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 center = vUv - 0.5;
  float radial = clamp(length(center) * 1.41421356, 0.0, 1.0);
  vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
  float speed = clamp(uVelocity, 0.0, 1.0);
  vec2 shift = center * (0.0015 + 0.009 * speed);

  // Scroll-linked chromatic separation: zero high-cost work when nearly still.
  vec4 base = texture2D(tDiffuse, vUv);
  if (speed > 0.025) {
    float red = texture2D(tDiffuse, clamp(vUv + shift, 0.0, 1.0)).r;
    float blue = texture2D(tDiffuse, clamp(vUv - shift, 0.0, 1.0)).b;
    base.rgb = mix(base.rgb, vec3(red, base.g, blue), smoothstep(0.025, 0.65, speed));
  }

  // A subtle artistic near/far focal falloff, not physical depth of field.
  // Five taps only near the periphery; not used at low quality.
  float focusWeight = smoothstep(0.37, 0.98, radial) * clamp(uFocus, 0.0, 1.0);
  if (focusWeight > 0.025) {
    vec2 delta = pixel * (1.15 + 2.0 * focusWeight);
    vec4 soft = (texture2D(tDiffuse, clamp(vUv + vec2(delta.x, 0.0), 0.0, 1.0))
      + texture2D(tDiffuse, clamp(vUv - vec2(delta.x, 0.0), 0.0, 1.0))
      + texture2D(tDiffuse, clamp(vUv + vec2(0.0, delta.y), 0.0, 1.0))
      + texture2D(tDiffuse, clamp(vUv - vec2(0.0, delta.y), 0.0, 1.0))) * 0.25;
    base = mix(base, soft, focusWeight * 0.20);
  }

  vec3 bloom = texture2D(uBloom, vUv).rgb * uBloomStrength;
  vec3 colour = base.rgb + bloom;
  float vignette = 1.0 - 0.20 * smoothstep(0.25, 1.0, radial);
  colour *= vignette;
  float grain = (rand(floor(vUv * uResolution) + floor(uTime * 12.0) * 0.11) - 0.5);
  colour += grain * 0.014;

  // Preserve transparent scene pixels so the CSS background, links, and
  // fallback structure remain visible behind the optical composition.
  float coverage = clamp(max(base.a, max(bloom.r, max(bloom.g, bloom.b)) * 1.35), 0.0, 1.0);
  gl_FragColor = vec4(max(colour, vec3(0.0)), coverage);
}
