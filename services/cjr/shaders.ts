
// SHADER COMPONENT - JELLY EFFECT
// Vertex Shader: Wobbles vertices based on time and position (Soft Body simulation)
// Fragment Shader: Simple color + rim lighting

export const JELLY_VERTEX = `
  precision mediump float;

  attribute vec2 aVertexPosition;
  attribute vec2 aUvs;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float uTime;
  uniform float uWobble;
  uniform float uSquish;
  uniform int uDeformMode; // 0=None, 1=Spike

  varying vec2 vUvs;
  varying vec2 vPos;

  void main() {
    vUvs = aUvs;
    
    vec2 pos = aVertexPosition;
    vPos = pos;
    
    // Base Wobble
    float angle = atan(pos.y, pos.x);
    float dist = length(pos);
    float wave = sin(angle * 5.0 + uTime * 5.0) * uWobble * dist;
    
    // Squish
    pos.x *= (1.0 + uSquish);
    pos.y *= (1.0 - uSquish);
    
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

    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
  }
`;

export const JELLY_FRAGMENT = `
  precision mediump float;

  varying vec2 vUvs;
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
  }
`;
