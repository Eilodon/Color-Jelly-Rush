<<<<<<< Updated upstream

// SHADER COMPONENT - JELLY EFFECT
// Vertex Shader: Wobbles vertices based on time and position (Soft Body simulation)
// Fragment Shader: Simple color + rim lighting
=======
>>>>>>> Stashed changes

export const JELLY_VERTEX = `
  precision mediump float;
  attribute vec2 aVertexPosition;
  attribute vec2 aUvs;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float uTime;
  uniform float uWobble;
  uniform float uSquish;
<<<<<<< Updated upstream
  uniform int uDeformMode; // 0=None, 1=Spike

  varying vec2 vUvs;
  varying vec2 vPos;
=======
  uniform float uPulsePhase;
  uniform int uDeformMode;

  varying vec2 vUvs;
  varying vec2 vPos;
  varying float vDist;
>>>>>>> Stashed changes

  void main() {
    vUvs = aUvs;
    
<<<<<<< Updated upstream
    vec2 pos = aVertexPosition;
    vPos = pos;
    
    // Base Wobble
    float angle = atan(pos.y, pos.x);
    float dist = length(pos);
    float wave = sin(angle * 5.0 + uTime * 5.0) * uWobble * dist;
=======
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
>>>>>>> Stashed changes
    
    // Squish
    pos.x *= (1.0 + uSquish);
    pos.y *= (1.0 - uSquish);
<<<<<<< Updated upstream
    
    // Deform Modes
    if (uDeformMode == 1) {
        // SPIKE MODE (Gai)
        float spike = sin(angle * 12.0 + uTime * 2.0) * 0.2;
        // Clamp negative spikes to keep shape mostly convex? No, let it look wild.
        // Make spikes sharp?
        spike = pow(abs(sin(angle * 8.0 + uTime * 4.0)), 2.0) * 0.3 * dist;
        pos += vec2(cos(angle), sin(angle)) * spike;
    } else {
        // Standard Wobble
        pos += vec2(cos(angle), sin(angle)) * wave;
    }
=======
>>>>>>> Stashed changes

    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
    vDist = length(aVertexPosition); // Approximate dist from attrib
  }
`;

export const JELLY_FRAGMENT = `
  precision mediump float;
  varying vec2 vUvs;
<<<<<<< Updated upstream
  varying vec2 vPos;

  uniform vec3 uColor; 
  uniform float uAlpha;
  uniform float uTime;
  uniform int uPatternMode; // 0=None, 1=Fire, 2=Electric

  // Simplex Noise (mock) or Sine interaction
  float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUvs, center) * 2.0;
    
    float alpha = 1.0 - smoothstep(0.9, 1.0, dist);
    float rim = smoothstep(0.7, 0.95, dist) * 0.5;
    
    vec3 finalColor = uColor + rim;

    // PATTERN MODES
    if (uPatternMode == 1) {
        // FIRE / MAGMA
        // Moving noise texture
        float n = noise(vUvs * 10.0 + uTime); 
        float burn = smoothstep(0.4, 0.6, sin(vUvs.y * 10.0 + uTime * 5.0) * 0.5 + 0.5);
        finalColor = mix(finalColor, vec3(1.0, 0.2, 0.0), burn * 0.5);
    } 
    else if (uPatternMode == 2) {
        // ELECTRIC
        float bolt = abs(sin(vUvs.x * 20.0 + uTime * 10.0 + vUvs.y * 10.0));
        bolt = 1.0 - smoothstep(0.02, 0.05, bolt);
        finalColor += vec3(0.5, 0.8, 1.0) * bolt;
    }

    gl_FragColor = vec4(finalColor, alpha * uAlpha);
=======
  
  uniform vec3 uColor; 
  uniform float uAlpha;
  uniform float uTime;
  uniform float uEnergy;
  uniform int uPatternMode;

  // EIDOLON-V: Fast Hash thay vì sin/cos nặng nề
  float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
  }

  void main() {
    // 1. Soft Circle
    vec2 center = vec2(0.5);
    float dist = length(vUvs - center) * 2.0;
    float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
    
    if (alpha < 0.01) discard;

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

    gl_FragColor = vec4(color, alpha * uAlpha);
>>>>>>> Stashed changes
  }
`;
