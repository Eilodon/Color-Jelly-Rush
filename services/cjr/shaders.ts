
export const JELLY_VERTEX = `
  #version 300 es
  precision mediump float;
  in vec2 position;
  in vec2 uv;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float uTime;
  uniform float uWobble;
  uniform float uSquish;
  uniform float uPulsePhase;
  uniform int uDeformMode;

  out vec2 vUvs;

  void main() {
    vUvs = uv;
    
    vec2 pos = position;
    
    // Optimized Pulse
    float pulse = sin(uTime * 5.0 + uPulsePhase);
    float heartbeat = pulse * 0.05;
    
    // Spike Mode
    if (uDeformMode == 1) {
        float angle = atan(pos.y, pos.x);
        float spike = abs(sin(angle * 8.0 + uTime * 10.0));
        pos += normalize(pos) * spike * 0.3;
    } else {
        pos *= (1.0 + heartbeat);
    }
    
    // Squish
    pos.x *= (1.0 + uSquish);
    pos.y *= (1.0 - uSquish);

    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
  }
`;

export const JELLY_FRAGMENT = `
  #version 300 es
  precision mediump float;
  in vec2 vUvs;
  
  uniform vec3 uJellyColor; 
  uniform float uAlpha;
  uniform float uTime;
  uniform float uEnergy;
  uniform int uPatternMode;
  uniform float uAberration;

  out vec4 fragColor;

  float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
  }

  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUvs - center) * 2.0;

    // Chromatic Aberration
    float distR = length((vUvs + vec2(uAberration, 0.0)) - center) * 2.0;
    float distB = length((vUvs - vec2(uAberration, 0.0)) - center) * 2.0;

    float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
    float alphaR = 1.0 - smoothstep(0.8, 1.0, distR);
    float alphaB = 1.0 - smoothstep(0.8, 1.0, distB);
    
    if (max(alpha, max(alphaR, alphaB)) < 0.01) discard;

    vec3 color = uJellyColor;
    float rim = smoothstep(0.6, 0.95, dist);
    color += vec3(0.5) * rim;

    float grain = hash(vUvs * 10.0 + uTime) * 0.1;
    color += vec3(grain);

    float core = smoothstep(0.5, 0.0, dist) * uEnergy;
    color += uJellyColor * core * 1.5;

    if (uPatternMode == 1) { // Magma
        float strip = sin(vUvs.y * 20.0 + uTime * 5.0);
        color = mix(color, vec3(1.0, 0.5, 0.0), step(0.9, strip) * uEnergy);
    } else if (uPatternMode == 2) { // Electric
        float bolt = step(0.95, fract(sin(dot(vUvs, vec2(12.9898,78.233)) + uTime) * 43758.5453));
        color += vec3(0.8, 0.9, 1.0) * bolt;
    }

    // Aberration Split
    vec3 finalColor;
    finalColor.r = color.r * (uAberration > 0.0 ? alphaR : 1.0);
    finalColor.g = color.g;
    finalColor.b = color.b * (uAberration > 0.0 ? alphaB : 1.0);
    
    float finalAlpha = (uAberration > 0.0) ? max(alpha, max(alphaR, alphaB)) : alpha;

    fragColor = vec4(finalColor, finalAlpha * uAlpha);
  }
`;
