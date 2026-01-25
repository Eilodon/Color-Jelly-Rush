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
  uniform float uEnergy;      // Match% (0..1)
  uniform int uPatternMode;   // 0=Liquid, 1=Magma, 2=Electric

  // --- PRIMITIVES ---
  vec2 rotate(vec2 v, float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c) * v;
  }

  // --- NOISE ---
  vec3 hash3(vec2 p) {
      vec3 q = vec3(dot(p,vec2(127.1,311.7)), 
                    dot(p,vec2(269.5,183.3)), 
                    dot(p,vec2(419.2,371.9)));
      return fract(sin(q)*43758.5453);
  }

  float noise(vec2 x) {
      vec2 p = floor(x);
      vec2 f = fract(x);
      f = f*f*(3.0-2.0*f);
      float n = p.x + p.y*57.0;
      // Simple value noise
      return mix(mix( dot(hash3(p+vec2(0,0)).xy, f-vec2(0,0)), 
                      dot(hash3(p+vec2(1,0)).xy, f-vec2(1,0)), f.x),
                 mix( dot(hash3(p+vec2(0,1)).xy, f-vec2(0,1)), 
                      dot(hash3(p+vec2(1,1)).xy, f-vec2(1,1)), f.x), f.y) + 0.5;
  }

  float fbm(vec2 p) {
      float f = 0.0;
      float w = 0.5;
      float t = uTime * 0.1;
      for (int i=0; i<3; i++) {
          f += w * noise(p + t);
          p *= 2.0; 
          w *= 0.5;
          p = rotate(p, 0.5);
      }
      return f;
  }

  void main() {
    // 1. CIRCLE MASK & SOFT EDGE
    vec2 center = vec2(0.5);
    float d = length(vUvs - center) * 2.0; // 0..1
    float alpha = 1.0 - smoothstep(0.85, 1.0, d);
    
    if (alpha < 0.01) discard;

    // 2. INTERNAL COORDINATES (WARPED)
    vec2 uv = vUvs * 2.5; 
    float warp = fbm(uv + vec2(uTime * 0.2));
    float fluid = fbm(uv + warp + uTime * 0.1);

    // 3. COLOR PALETTE
    // Core is saturated, Rim is white-hot
    vec3 baseColor = uColor;
    
    // 4. LIGHTING
    // Rim Light (Fresnel)
    float rim = smoothstep(0.5, 0.95, d);
    vec3 lightColor = mix(baseColor * 0.7, vec3(1.0), rim * 0.5);

    // 5. FLUID VEINS
    // Veins are brighter
    lightColor += baseColor * fluid * 0.5;

    // 6. ENERGY BLOOM (Match %)
    // If energy > 50%, inner glow increases
    float glow = uEnergy * smoothstep(0.0, 0.8, 1.0 - d); 
    lightColor += baseColor * glow * 1.5;

    // 7. PATTERNS
    if (uPatternMode == 1) { 
        // MAGMA: Pulsing Heat
        float fire = smoothstep(0.4, 0.9, noise(uv * 4.0 - uTime * 2.0));
        lightColor = mix(lightColor, vec3(1.5, 0.5, 0.1), fire * uEnergy);
    } else if (uPatternMode == 2) {
        // ELECTRIC: Arcs
        float bolt = smoothstep(0.8, 0.9, noise(uv * 10.0 + uTime * 8.0));
        lightColor += vec3(0.6, 0.8, 1.0) * bolt * 2.0;
    }

    gl_FragColor = vec4(lightColor, alpha * uAlpha);
  }
`;
