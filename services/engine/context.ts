import { GRID_CELL_SIZE } from '../../constants';
import { Entity, Particle } from '../../types';
import { randomRange } from './math';

// --- Optimization: Persistent Spatial Grid ---
// WE DO NOT DESTROY THE GRID EVERY FRAME. WE REUSE THE ARRAYS.
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Entity[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear() {
    // Optimization: Don't delete keys, just empty the arrays.
    // This reduces GC pressure significantly.
    for (const bucket of this.grid.values()) {
      bucket.length = 0;
    }
  }

  insert(entity: Entity) {
    const cellX = Math.floor(entity.position.x / this.cellSize);
    const cellY = Math.floor(entity.position.y / this.cellSize);
    const key = `${cellX},${cellY}`;

    let bucket = this.grid.get(key);
    if (!bucket) {
      bucket = [];
      this.grid.set(key, bucket);
    }
    bucket.push(entity);
  }

  getNearby(entity: Entity): Entity[] {
    const cellX = Math.floor(entity.position.x / this.cellSize);
    const cellY = Math.floor(entity.position.y / this.cellSize);

    const nearby: Entity[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const bucket = this.grid.get(key);
        if (bucket && bucket.length > 0) {
          // Fast array copy
          for (let i = 0; i < bucket.length; i++) {
            nearby.push(bucket[i]);
          }
        }
      }
    }
    return nearby;
  }
}

// --- Optimization: Particle Pooling ---
class ParticlePool {
  private pool: Particle[] = [];

  get(x: number, y: number, color: string, speed: number): Particle {
    const p = this.pool.pop() || this.createNew();
    p.position.x = x;
    p.position.y = y;
    p.velocity.x = randomRange(-speed, speed);
    p.velocity.y = randomRange(-speed, speed);
    p.color = color;
    p.life = 1.0;
    p.maxLife = 1.0;
    p.style = undefined;
    p.lineLength = undefined;
    p.lineWidth = undefined;
    p.angle = undefined;
    p.isDead = false;
    p.radius = randomRange(3, 8);
    return p;
  }

  release(particle: Particle) {
    this.pool.push(particle);
  }

  private createNew(): Particle {
    return {
      id: Math.random().toString(),
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0,
      color: '',
      life: 0,
      maxLife: 1.0,
      isDead: true,
      trail: [],
    };
  }
}

// --- S-TIER: GameEngine Class (Encapsulated Singletons) ---
// Each GameState owns its own engine instance, preventing multi-mount issues.
export class GameEngine {
  public spatialGrid: SpatialGrid;
  public particlePool: ParticlePool;

  constructor() {
    this.spatialGrid = new SpatialGrid(GRID_CELL_SIZE);
    this.particlePool = new ParticlePool();
  }
}

// Factory function for creating engine instances
export const createGameEngine = (): GameEngine => new GameEngine();

// Module-level reference to current engine (set at start of each updateGameState call)
// This is safe because:
// 1. It's set FROM the state at the start of each frame
// 2. Only one game loop runs at a time per game instance
// 3. Each GameState owns its own GameEngine via state.engine
let currentEngine: GameEngine | null = null;
let currentSpatialGrid: SpatialGrid | null = null;

export const bindEngine = (engine: GameEngine) => {
  currentEngine = engine;
  currentSpatialGrid = engine.spatialGrid;
};

export const getCurrentEngine = () => {
  if (!currentEngine) {
    throw new Error('GameEngine not bound to update loop');
  }
  return currentEngine;
};

export const getCurrentSpatialGrid = () => {
  if (!currentSpatialGrid) {
    throw new Error('Spatial grid not bound to update loop');
  }
  return currentSpatialGrid;
};
