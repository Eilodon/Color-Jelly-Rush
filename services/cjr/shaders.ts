
export const JELLY_VERTEX = `
  precision mediump float;
  attribute vec2 aVertexPosition;
  attribute vec2 aUvs;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float uTime;
  uniform float uWobble;
  uniform float uSquish;
  uniform float uPulsePhase;
  uniform int uDeformMode;

  varying vec2 vUvs;
  varying vec2 vPos;
  varying float vDist;

  void main() {
    vUvs = aUvs;
    
    vec2 pos = aVertexPosition;
    vPos = pos;
    
    // Optimized Pulse: Dùng mix thay vì sin chồng chéo
    float pulse = sin(uTime * 5.0 + uPulsePhase);
    float heartbeat = pulse * 0.05;
    
    // Spike Mode (Combat) - Giữ nguyên logic nhưng tối ưu toán học
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
    vDist = length(aVertexPosition); // Approximate dist from attrib
  }
`;

export const JELLY_FRAGMENT = `
  precision mediump float;
  varying vec2 vUvs;
  
  uniform vec3 uColor; 
  uniform float uAlpha;
  uniform float uTime;
  uniform float uEnergy;
  uniform int uPatternMode;
  uniform float uAberration; // EIDOLON-V: Juice Uniform

  // EIDOLON-V: Fast Hash thay vì sin/cos nặng nề
  float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
  }

  void main() {
    // 1. Soft Circle (Procedural Aberration)
    vec2 center = vec2(0.5);
    float dist = length(vUvs - center) * 2.0;

    // EIDOLON-V: Chromatic Aberration (Shape Split)
    float distR = length((vUvs + vec2(uAberration, 0.0)) - center) * 2.0;
    float distB = length((vUvs - vec2(uAberration, 0.0)) - center) * 2.0;

    float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
    float alphaR = 1.0 - smoothstep(0.8, 1.0, distR);
    float alphaB = 1.0 - smoothstep(0.8, 1.0, distB);
    
    if (max(alpha, max(alphaR, alphaB)) < 0.01) discard;

    // 2. Base Color & Rim Light
    vec3 color = uColor;
    float rim = smoothstep(0.6, 0.95, dist);
    color += vec3(0.5) * rim;

    // 3. Simple Noise (Grain) thay vì FBM phức tạp
    float grain = hash(vUvs * 10.0 + uTime) * 0.1;
    color += grain;

    // 4. Energy Glow (Inner core)
    float core = smoothstep(0.5, 0.0, dist) * uEnergy;
    color += uColor * core * 1.5;

    // 5. Pattern Modes (Simplified)
    if (uPatternMode == 1) { // Magma
        float strip = sin(vUvs.y * 20.0 + uTime * 5.0);
        color = mix(color, vec3(1.0, 0.5, 0.0), step(0.9, strip) * uEnergy);
    } else if (uPatternMode == 2) { // Electric
        float bolt = step(0.95, fract(sin(dot(vUvs, vec2(12.9898,78.233)) + uTime) * 43758.5453));
        color += vec3(0.8, 0.9, 1.0) * bolt;
    }

    // EIDOLON-V: Apply Aberration (Phase 3.2)
    // "The Juice": Split channels based on shifted masks
    vec3 finalColor;
    
    // Simulate texture2D(uSampler, vUvs + offset).r
    // But for procedural, we shift the input coordinate for distance field
    finalColor.r = color.r * (uAberration > 0.0 ? alphaR : 1.0);
    finalColor.g = color.g; // Green stays center
    finalColor.b = color.b * (uAberration > 0.0 ? alphaB : 1.0);
    
    // Mix pattern result (simplified: apply pattern to all, but mask R/B)
    
    // Use the max alpha for the container
    float finalAlpha = (uAberration > 0.0) ? max(alpha, max(alphaR, alphaB)) : alpha;

    gl_FragColor = vec4(finalColor, finalAlpha * uAlpha);
  }
`;
