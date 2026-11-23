precision highp float;

uniform vec3 uAccent;
uniform vec3 uMist;

varying vec2 vQuadUv;
varying float vOpacity;
varying float vHead;

void main() {
  float lateral = abs(vQuadUv.x * 2.0 - 1.0);
  float core = exp(-lateral * lateral * 7.2);
  float endFade = smoothstep(0.0, 0.13, vQuadUv.y) *
    (1.0 - smoothstep(0.87, 1.0, vQuadUv.y));
  float head = pow(smoothstep(0.22, 1.0, vQuadUv.y), 2.0);
  float alpha = core * endFade * (0.40 + 0.60 * head) * vOpacity;
  vec3 colour = mix(uMist * 0.72, uAccent * 0.88, 0.19 + 0.5 * head + 0.2 * vHead);
  gl_FragColor = vec4(colour, alpha);
}
