// SHADER COMPONENT - BIOLUMINESCENT JELLY
// Visually simulates a living, translucent, fluid organism.

export const JELLY_VERTEX = `
  precision mediump float;

  attribute vec2 aVertexPosition;
  attribute vec2 aUvs;

  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;

  uniform float uTime;
  uniform float uWobble;      // Intensity of physical wobble
  uniform float uSquish;      // Compression due to velocity
  uniform float uEnergy;      // New: Represents Match% or Power Level (0..1)
  uniform int uDeformMode;    // 0=None, 1=Spike

  varying vec2 vUvs;
  varying vec2 vPos;
  varying float vDist;        // Distance from center (0..1)

  void main() {
    vUvs = aUvs;
    vec2 pos = aVertexPosition;
    
    // 1. Organic Pulse (Heartbeat) based on Energy
    float heartbeat = sin(uTime * (3.0 + uEnergy * 5.0)) * (0.02 + uEnergy * 0.05);
    pos *= (1.0 + heartbeat);

    // 2. Velocity Squish (Directional would be better, but axial is cheap)
    pos.x *= (1.0 + uSquish);
    pos.y *= (1.0 - uSquish);
    
    // 3. Noise-based Wobble (Perimeter distortion)
    float angle = atan(pos.y, pos.x);
    float dist = length(pos);
    
    // Multi-frequency wave for organic feel
    float wave = sin(angle * 5.0 + uTime * 4.0) 
               + sin(angle * 13.0 - uTime * 6.0) * 0.5;
               
    float distortion = wave * uWobble * dist;
    
    // 4. Spike Mode (Combat/Aggro)
    if (uDeformMode == 1) {
        float spike = pow(abs(sin(angle * 8.0 + uTime * 15.0)), 6.0); // Sharper spikes
        pos += normalize(pos) * spike * 0.4; // Push outward
    } else {
        pos += normalize(pos) * distortion;
    }

    vPos = pos; // Pass local pos to fragment
    vDist = dist; // Pass normalized dist

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
  uniform float uEnergy;      // Match% (0..1) determines glow intensity
  uniform int uPatternMode;   // 0=Liquid, 1=Magma, 2=Electric

  // --- Fast Pseudo-Noise (Simplex-like) ---
  vec2 hash(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }
  
  float noise(in vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2 i = floor(p + (p.x+p.y)*K1);
    vec2 a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2 o = vec2(m,1.0-m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot(n, vec3(70.0));
  }

  // --- Domain Warping (Liquid Flow) ---
  float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 3; i++) { // 3 Octaves
        f += w * noise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
  }

  void main() {
    // 1. Shape Masking (Soft Circle)
    vec2 center = vec2(0.5);
    float dist = distance(vUvs, center) * 2.0; // 0 at center, 1 at edge
    float alpha = 1.0 - smoothstep(0.85, 1.0, dist); // Soft edge
    
    if (alpha <= 0.01) discard; // Optimization

    // 2. Coordinate Flow
    vec2 flowUV = vUvs * 2.5 + vec2(uTime * 0.2, uTime * 0.1);
    
    // 3. Internal Texture Generation
    float fluid = fbm(flowUV + fbm(flowUV + uTime * 0.3)); // Double Domain Warp
    
    // 4. Lighting Model (Fake SSS)
    // Core is darker/saturated, Rim is bright
    float fresnel = smoothstep(0.4, 0.9, dist);
    
    // Base Color Mixing
    vec3 coreColor = uColor * 0.7; // Darker core
    vec3 rimColor = uColor + 0.3;  // Whiter rim
    
    vec3 finalColor = mix(coreColor, rimColor, fresnel);
    
    // 5. Add Fluid Detail
    // Fluid veins appear brighter
    finalColor += uColor * fluid * (0.3 + uEnergy * 0.5); 

    // 6. Pattern Overlays (Tattoos)
    if (uPatternMode == 1) { 
        // MAGMA (Overdrive)
        float fire = smoothstep(0.4, 0.8, noise(vUvs * 8.0 - uTime * 2.0));
        finalColor = mix(finalColor, vec3(1.0, 0.9, 0.2), fire * 0.8);
    } else if (uPatternMode == 2) { 
        // ELECTRIC (Speed/Lightning)
        float bolt = abs(1.0 / (sin(vUvs.y * 20.0 + uTime * 10.0 + noise(vUvs*5.0)*5.0) * 20.0));
        finalColor += vec3(0.6, 0.8, 1.0) * bolt * 2.0;
    }

    // 7. Energy Glow (Match%)
    // If energy is high, the whole jelly blooms
    if (uEnergy > 0.8) {
        float glow = smoothstep(0.8, 1.0, uEnergy) * sin(uTime * 10.0) * 0.5 + 0.5;
        finalColor += vec3(1.0, 1.0, 0.8) * glow * 0.3;
    }

    gl_FragColor = vec4(finalColor, alpha * uAlpha);
  }
`;
