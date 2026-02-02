/**
 * IMPERATOR PLAN Phase 4: Standalone ParticleSystem
 * 
 * Decouples VFX from React GameState to prevent unnecessary re-renders.
 * Consumes vfxBuffer directly in requestAnimationFrame loop.
 */

import { vfxBuffer, VFXRingBuffer, VFX_TYPES } from '../engine/VFXRingBuffer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
  type: number;
  alpha: number;
}

/**
 * Standalone Particle System
 * 
 * IMPERATOR Phase 4:
 * - Reads directly from VFXRingBuffer (zero React involvement)
 * - Maintains internal particle pool (zero GC)
 * - Renders in requestAnimationFrame without state mutation
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxParticles: number;
  
  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
    // Pre-allocate particle pool
    for (let i = 0; i < 100; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      radius: 5,
      color: 0xffffff,
      type: 0,
      alpha: 1,
    };
  }

  /**
   * IMPERATOR Phase 4: Consume VFX buffer directly
   * Called in requestAnimationFrame - NO React state mutation
   */
  updateFromBuffer(dt: number): void {
    const { data, count, eventSize } = vfxBuffer.getRawData();
    
    // Spawn particles from VFX events
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      
      const idx = i * eventSize;
      const x = data[idx];
      const y = data[idx + 1];
      const color = data[idx + 2];
      const type = data[idx + 3];
      
      this.spawnParticle(x, y, color, type);
    }
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;
      
      if (p.life <= 0) {
        // Return to pool instead of garbage collection
        this.pool.push(this.particles[i]);
        this.particles.splice(i, 1);
      }
    }
    
    // Clear VFX buffer after consumption
    vfxBuffer.clear();
  }

  private spawnParticle(x: number, y: number, color: number, type: number): void {
    const p = this.pool.pop() ?? this.createParticle();
    
    p.x = x;
    p.y = y;
    p.color = color;
    p.type = type;
    p.life = 1.0; // 1 second default
    p.maxLife = 1.0;
    p.alpha = 1;
    
    // Type-specific initialization
    switch (type) {
      case VFX_TYPES.EXPLODE:
        p.radius = 8 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        break;
        
      case VFX_TYPES.SHOCKWAVE:
        p.radius = 5;
        p.vx = 0;
        p.vy = 0;
        p.life = 0.5;
        p.maxLife = 0.5;
        break;
        
      case VFX_TYPES.PARTICLE_BURST:
        p.radius = 3 + Math.random() * 5;
        p.vx = (Math.random() - 0.5) * 200;
        p.vy = (Math.random() - 0.5) * 200;
        break;
        
      default:
        p.radius = 5;
        p.vx = 0;
        p.vy = 0;
    }
    
    this.particles.push(p);
  }

  /**
   * IMPERATOR Phase 4: Direct canvas render
   * No React involvement - maximum performance
   */
  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const { r, g, b } = this.unpackRGB(p.color);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      switch (p.type) {
        case VFX_TYPES.SHOCKWAVE:
        case VFX_TYPES.RING_PULSE:
          // Expanding ring effect
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (2 - p.alpha * 2), 0, Math.PI * 2);
          ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        default:
          // Standard particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private unpackRGB(packed: number): { r: number; g: number; b: number } {
    return {
      r: (packed >> 16) & 255,
      g: (packed >> 8) & 255,
      b: packed & 255,
    };
  }

  /**
   * Get current particle count (for debugging)
   */
  get count(): number {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.pool.push(...this.particles);
    this.particles = [];
  }
}

// Singleton instance for GameCanvas
export const particleSystem = new ParticleSystem();
