// Original four-dimensional gradient (Perlin-style) noise.
// All sixteen corners of a 4D unit hypercube contribute through quintic
// C2-continuous interpolation. The fourth dimension is continuous time.
// Independent of simplex code; no external GLSL snippet is embedded.
vec4 hash44(vec4 p) {
  p = fract(p * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p += dot(p, p.wzxy + 33.33);
  return fract((p.xxyz + p.yzzw) * p.zywx);
}

vec4 gradient4(vec4 cell) {
  vec4 gradient = hash44(cell) * 2.0 - 1.0;
  return gradient * inversesqrt(max(dot(gradient, gradient), 0.0001));
}

float noise4D(vec4 samplePoint) {
  vec4 cell = floor(samplePoint);
  vec4 fracPart = fract(samplePoint);
  vec4 smoothPart = fracPart * fracPart * fracPart *
    (fracPart * (fracPart * 6.0 - 15.0) + 10.0);
  float noiseValue = 0.0;

  for (int a = 0; a < 2; a++) {
    for (int b = 0; b < 2; b++) {
      for (int c = 0; c < 2; c++) {
        for (int d = 0; d < 2; d++) {
          vec4 corner = vec4(float(a), float(b), float(c), float(d));
          vec4 delta = fracPart - corner;
          float weight = mix(1.0 - smoothPart.x, smoothPart.x, corner.x) *
            mix(1.0 - smoothPart.y, smoothPart.y, corner.y) *
            mix(1.0 - smoothPart.z, smoothPart.z, corner.z) *
            mix(1.0 - smoothPart.w, smoothPart.w, corner.w);
          noiseValue += weight * dot(gradient4(cell + corner), delta);
        }
      }
    }
  }

  return noiseValue * 1.35;
}
