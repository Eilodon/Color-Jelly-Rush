import { GRID_CELL_SIZE, MAX_SPEED_BASE, FRICTION_BASE } from '../../constants';
import { Entity, Particle, Player, Bot } from '../../types';
import { randomRange } from './math';

// =============================================================================
// DOD PHYSICS WORLD - Pure Data-Oriented Design
// =============================================================================
// Zero GC: Pre-allocated Float32Arrays
// Cache-friendly: Sequential memory access patterns
// V8 Optimized: Stable Hidden Classes, no dynamic property changes
// =============================================================================

const MAX_ENTITIES = 1024; // Pre-allocate for max entities (50 players + bots + food + projectiles)
const STRIDE_POS = 2;      // x, y per entity
const STRIDE_VEL = 2;      // vx, vy per entity

/**
 * PhysicsWorld - DOD storage for all entity physics data
 * All physics operations read/write directly on these arrays via index.
 * NO sync back to Entity objects for physics calculations.
 */
export class PhysicsWorld {
  // Core physics arrays (pre-allocated, never reallocated)
  public readonly positions: Float32Array;      // [x0, y0, x1, y1, ...]
  public readonly prevPositions: Float32Array;  // For render interpolation
  public readonly velocities: Float32Array;     // [vx0, vy0, vx1, vy1, ...]
  public readonly radii: Float32Array;          // [r0, r1, r2, ...]
  public readonly masses: Float32Array;         // Derived from radius for physics

  // Entity state flags (packed as Uint8 for cache efficiency)
  public readonly flags: Uint8Array;            // [isDead, isStatic, ...]

  // Entity ID ↔ Index mapping
  private readonly idToIndex: Map<string, number> = new Map();
  private readonly indexToId: string[] = [];
  private readonly freeIndices: number[] = [];
  private activeCount: number = 0;

  // Physics constants (avoid repeated property access)
  private readonly friction: number = 0.92;
  private readonly integrationScale: number = 10;
  private readonly baseMassRadius: number = 28;

  constructor(maxEntities: number = MAX_ENTITIES) {
    // Pre-allocate all arrays at construction time (ZERO runtime allocation)
    this.positions = new Float32Array(maxEntities * STRIDE_POS);
    this.prevPositions = new Float32Array(maxEntities * STRIDE_POS);
    this.velocities = new Float32Array(maxEntities * STRIDE_VEL);
    this.radii = new Float32Array(maxEntities);
    this.masses = new Float32Array(maxEntities);
    this.flags = new Uint8Array(maxEntities);

    // Initialize free list (all indices available)
    for (let i = maxEntities - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }

  /**
   * Register an entity and get its physics index
   * Called once when entity is created
   */
  allocate(id: string): number {
    // Check if already allocated
    const existing = this.idToIndex.get(id);
    if (existing !== undefined) return existing;

    // Get free index (O(1) pop from end)
    const index = this.freeIndices.pop();
    if (index === undefined) {
      console.error('[PhysicsWorld] Max entities exceeded!');
      return -1;
    }

    // Register mapping
    this.idToIndex.set(id, index);
    this.indexToId[index] = id;
    this.activeCount++;

    // Initialize to zero
    const posIdx = index * STRIDE_POS;
    this.positions[posIdx] = 0;
    this.positions[posIdx + 1] = 0;
    this.prevPositions[posIdx] = 0;
    this.prevPositions[posIdx + 1] = 0;
    this.velocities[posIdx] = 0;
    this.velocities[posIdx + 1] = 0;
    this.radii[index] = 0;
    this.masses[index] = 1;
    this.flags[index] = 0;

    return index;
  }

  /**
   * Free an entity's physics slot
   */
  free(id: string): void {
    const index = this.idToIndex.get(id);
    if (index === undefined) return;

    this.idToIndex.delete(id);
    this.indexToId[index] = '';
    this.freeIndices.push(index);
    this.activeCount--;

    // Mark as dead
    this.flags[index] = 1;
  }

  /**
   * Get index for an entity ID (O(1) lookup)
   */
  getIndex(id: string): number {
    return this.idToIndex.get(id) ?? -1;
  }

  /**
   * Get ID for an index
   */
  getId(index: number): string {
    return this.indexToId[index] || '';
  }

  /**
   * Sync entity data INTO physics world (called once per frame start)
   * This is the ONLY place we copy FROM entities
   */
  syncFromEntity(entity: Entity): void {
    let index = this.idToIndex.get(entity.id);
    if (index === undefined) {
      index = this.allocate(entity.id);
      if (index === -1) return;
    }

    const posIdx = index * STRIDE_POS;
    this.positions[posIdx] = entity.position.x;
    this.positions[posIdx + 1] = entity.position.y;
    this.velocities[posIdx] = entity.velocity.x;
    this.velocities[posIdx + 1] = entity.velocity.y;
    this.radii[index] = entity.radius;
    this.flags[index] = entity.isDead ? 1 : 0;

    // Calculate mass from radius (only for players/bots)
    const mass = Math.max(1, Math.pow(entity.radius / this.baseMassRadius, 1.5));
    this.masses[index] = mass;
  }

  /**
   * Batch sync multiple entities (optimized for sequential access)
   */
  syncFromEntities(entities: Entity[]): void {
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      this.syncFromEntity(entities[i]);
    }
  }

  // ===========================================================================
  // PURE DOD PHYSICS OPERATIONS - Work directly on arrays via index
  // ===========================================================================

  /**
   * Integrate physics for a single entity (DOD style)
   * NO Entity object access - purely array operations
   */
  integrate(index: number, dt: number, speedMultiplier: number = 1): void {
    if (this.flags[index] & 1) return; // Skip dead entities

    const posIdx = index * STRIDE_POS;

    // 1. Store previous position for interpolation
    this.prevPositions[posIdx] = this.positions[posIdx];
    this.prevPositions[posIdx + 1] = this.positions[posIdx + 1];

    // 2. Apply friction (direct array mutation)
    this.velocities[posIdx] *= this.friction;
    this.velocities[posIdx + 1] *= this.friction;

    // 3. Integrate velocity → position
    const scale = dt * this.integrationScale;
    this.positions[posIdx] += this.velocities[posIdx] * scale;
    this.positions[posIdx + 1] += this.velocities[posIdx + 1] * scale;

    // 4. Speed clamping
    const vx = this.velocities[posIdx];
    const vy = this.velocities[posIdx + 1];
    const speedSq = vx * vx + vy * vy;

    const mass = this.masses[index];
    const speedScale = 1 / Math.pow(mass, 0.3);
    const maxSpeed = MAX_SPEED_BASE * speedScale * speedMultiplier;
    const maxSpeedSq = maxSpeed * maxSpeed;

    if (speedSq > maxSpeedSq) {
      const speed = Math.sqrt(speedSq);
      const k = maxSpeed / speed;
      this.velocities[posIdx] *= k;
      this.velocities[posIdx + 1] *= k;
    }
  }

  /**
   * Batch integrate all active entities (SIMD-friendly sequential access)
   * This is the main physics loop - processes arrays sequentially
   */
  integrateAll(dt: number, speedMultipliers: Map<string, number>): void {
    const posLen = this.positions.length;
    const friction = this.friction;
    const scale = dt * this.integrationScale;

    for (let index = 0; index < this.radii.length; index++) {
      if (this.flags[index] & 1) continue; // Skip dead
      if (this.radii[index] === 0) continue; // Skip unallocated

      const posIdx = index * STRIDE_POS;

      // Store prev
      this.prevPositions[posIdx] = this.positions[posIdx];
      this.prevPositions[posIdx + 1] = this.positions[posIdx + 1];

      // Friction
      this.velocities[posIdx] *= friction;
      this.velocities[posIdx + 1] *= friction;

      // Integrate
      this.positions[posIdx] += this.velocities[posIdx] * scale;
      this.positions[posIdx + 1] += this.velocities[posIdx + 1] * scale;

      // Speed clamp
      const vx = this.velocities[posIdx];
      const vy = this.velocities[posIdx + 1];
      const speedSq = vx * vx + vy * vy;

      const mass = this.masses[index];
      const speedScale = 1 / Math.pow(mass, 0.3);
      const id = this.indexToId[index];
      const multiplier = speedMultipliers.get(id) || 1;
      const maxSpeed = MAX_SPEED_BASE * speedScale * multiplier;
      const maxSpeedSq = maxSpeed * maxSpeed;

      if (speedSq > maxSpeedSq) {
        const speed = Math.sqrt(speedSq);
        const k = maxSpeed / speed;
        this.velocities[posIdx] *= k;
        this.velocities[posIdx + 1] *= k;
      }
    }
  }

  /**
   * Constrain entity to map boundary (DOD style)
   */
  constrainToMap(index: number, mapRadius: number): void {
    if (this.flags[index] & 1) return;

    const posIdx = index * STRIDE_POS;
    const x = this.positions[posIdx];
    const y = this.positions[posIdx + 1];
    const entityRadius = this.radii[index];

    const distSq = x * x + y * y;
    const boundaryCheck = mapRadius - entityRadius;

    if (distSq > boundaryCheck * boundaryCheck) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.001) {
        const safeR = boundaryCheck;
        const nx = x / dist;
        const ny = y / dist;

        // Clamp position
        this.positions[posIdx] = nx * safeR;
        this.positions[posIdx + 1] = ny * safeR;

        // Bounce velocity
        const vx = this.velocities[posIdx];
        const vy = this.velocities[posIdx + 1];
        const dot = vx * nx + vy * ny;

        if (dot > 0) {
          this.velocities[posIdx] -= dot * nx * 1.5;
          this.velocities[posIdx + 1] -= dot * ny * 1.5;
        }
      }
    }
  }

  /**
   * Check collision between two entities by index (DOD style)
   * Returns overlap distance if colliding, 0 otherwise
   */
  checkCollision(indexA: number, indexB: number): number {
    const posIdxA = indexA * STRIDE_POS;
    const posIdxB = indexB * STRIDE_POS;

    const dx = this.positions[posIdxA] - this.positions[posIdxB];
    const dy = this.positions[posIdxA + 1] - this.positions[posIdxB + 1];
    const distSq = dx * dx + dy * dy;

    const minR = this.radii[indexA] + this.radii[indexB];
    const minRSq = minR * minR;

    if (distSq < minRSq) {
      return minR - Math.sqrt(distSq);
    }
    return 0;
  }

  /**
   * Resolve collision with position correction (DOD style)
   */
  resolveCollision(indexA: number, indexB: number): void {
    const posIdxA = indexA * STRIDE_POS;
    const posIdxB = indexB * STRIDE_POS;

    const dx = this.positions[posIdxA] - this.positions[posIdxB];
    const dy = this.positions[posIdxA + 1] - this.positions[posIdxB + 1];
    const distSq = dx * dx + dy * dy;

    const minR = this.radii[indexA] + this.radii[indexB];

    if (distSq < minR * minR && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minR - dist;
      const push = overlap * 0.5;

      const nx = dx / dist;
      const ny = dy / dist;

      // Mass-based push ratio
      const m1 = this.radii[indexA];
      const m2 = this.radii[indexB];
      const total = m1 + m2;
      const r1 = m2 / total;
      const r2 = m1 / total;

      // Position correction
      this.positions[posIdxA] += nx * push * r1;
      this.positions[posIdxA + 1] += ny * push * r1;
      this.positions[posIdxB] -= nx * push * r2;
      this.positions[posIdxB + 1] -= ny * push * r2;
    }
  }

  // ===========================================================================
  // RENDER BRIDGE - Read-only access for rendering with interpolation
  // ===========================================================================

  /**
   * Get interpolated position for rendering (alpha = 0..1)
   * Returns position directly - no object allocation
   */
  getInterpolatedX(index: number, alpha: number): number {
    const posIdx = index * STRIDE_POS;
    const prev = this.prevPositions[posIdx];
    const curr = this.positions[posIdx];
    return prev + (curr - prev) * alpha;
  }

  getInterpolatedY(index: number, alpha: number): number {
    const posIdx = index * STRIDE_POS;
    const prev = this.prevPositions[posIdx + 1];
    const curr = this.positions[posIdx + 1];
    return prev + (curr - prev) * alpha;
  }

  /**
   * Get raw position (no interpolation)
   */
  getX(index: number): number {
    return this.positions[index * STRIDE_POS];
  }

  getY(index: number): number {
    return this.positions[index * STRIDE_POS + 1];
  }

  /**
   * Set position directly
   */
  setPosition(index: number, x: number, y: number): void {
    const posIdx = index * STRIDE_POS;
    this.positions[posIdx] = x;
    this.positions[posIdx + 1] = y;
  }

  /**
   * Set velocity directly
   */
  setVelocity(index: number, vx: number, vy: number): void {
    const posIdx = index * STRIDE_POS;
    this.velocities[posIdx] = vx;
    this.velocities[posIdx + 1] = vy;
  }

  /**
   * Add velocity (for impulses)
   */
  addVelocity(index: number, dvx: number, dvy: number): void {
    const posIdx = index * STRIDE_POS;
    this.velocities[posIdx] += dvx;
    this.velocities[posIdx + 1] += dvy;
  }

  getRadius(index: number): number {
    return this.radii[index];
  }

  setRadius(index: number, radius: number): void {
    this.radii[index] = radius;
    this.masses[index] = Math.max(1, Math.pow(radius / this.baseMassRadius, 1.5));
  }

  /**
   * Sync physics world data back to Entity (for game logic that still needs Entity)
   * This should be called AFTER physics update, BEFORE game logic
   */
  syncToEntity(entity: Entity): void {
    const index = this.idToIndex.get(entity.id);
    if (index === undefined) return;

    const posIdx = index * STRIDE_POS;

    // Write back to entity (for game logic compatibility)
    entity.prevPosition.x = this.prevPositions[posIdx];
    entity.prevPosition.y = this.prevPositions[posIdx + 1];
    entity.position.x = this.positions[posIdx];
    entity.position.y = this.positions[posIdx + 1];
    entity.velocity.x = this.velocities[posIdx];
    entity.velocity.y = this.velocities[posIdx + 1];
  }

  /**
   * Reset the physics world (clear all entities)
   */
  reset(): void {
    this.idToIndex.clear();
    this.indexToId.length = 0;
    this.freeIndices.length = 0;
    this.activeCount = 0;

    // Reset free list
    for (let i = MAX_ENTITIES - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    // Zero out arrays (optional - could skip for performance)
    this.positions.fill(0);
    this.prevPositions.fill(0);
    this.velocities.fill(0);
    this.radii.fill(0);
    this.masses.fill(0);
    this.flags.fill(0);
  }

  /**
   * Get active entity count (for debugging/stats)
   */
  getActiveCount(): number {
    return this.activeCount;
  }
}

// =============================================================================
// SPATIAL GRID - Hybrid OOP/DOD compatible
// =============================================================================
// Supports both Entity objects (for game logic) and DOD indices (for physics)
// Multi-layer hierarchical grid for different query ranges

// DOD Grid Layer - stores indices instead of Entity references
interface DODGridLayer {
  cellSize: number;
  grid: Map<number, number[]>;  // key → array of physics indices
}

// OOP Grid Layer - stores Entity references (for backward compatibility)
interface OOPGridLayer {
  cellSize: number;
  grid: Map<number, Entity[]>;
}

class SpatialGrid {
  // OOP layers (backward compatible)
  private layers: OOPGridLayer[];
  // DOD layers (new high-performance path)
  private dodLayers: DODGridLayer[];
  private frameCount: number = 0;

  constructor() {
    // OOP layers (backward compatible)
    this.layers = [
      { cellSize: 150, grid: new Map() },  // 0: High Precision
      { cellSize: 450, grid: new Map() },  // 1: Medium Range
      { cellSize: 1500, grid: new Map() }  // 2: Long Range (Vision)
    ];

    // DOD layers (same resolution, stores indices)
    this.dodLayers = [
      { cellSize: 150, grid: new Map() },
      { cellSize: 450, grid: new Map() },
      { cellSize: 1500, grid: new Map() }
    ];
  }

  // INTEGER key via bit-shifting
  private getKey(cellX: number, cellY: number): number {
    return ((cellX + 32768) << 16) | ((cellY + 32768) & 0xFFFF);
  }

  clear() {
    this.frameCount++;

    // Clear OOP layers
    for (const layer of this.layers) {
      for (const bucket of layer.grid.values()) {
        bucket.length = 0;
      }
      if (this.frameCount % 120 === 0) {
        for (const [key, bucket] of layer.grid.entries()) {
          if (bucket.length === 0) layer.grid.delete(key);
        }
      }
    }

    // Clear DOD layers
    for (const layer of this.dodLayers) {
      for (const bucket of layer.grid.values()) {
        bucket.length = 0;
      }
      if (this.frameCount % 120 === 0) {
        for (const [key, bucket] of layer.grid.entries()) {
          if (bucket.length === 0) layer.grid.delete(key);
        }
      }
    }
  }

  // ===========================================================================
  // OOP API (backward compatible)
  // ===========================================================================

  insert(entity: Entity) {
    for (const layer of this.layers) {
      const cx = Math.floor(entity.position.x / layer.cellSize);
      const cy = Math.floor(entity.position.y / layer.cellSize);
      const key = this.getKey(cx, cy);

      let bucket = layer.grid.get(key);
      if (!bucket) {
        bucket = [];
        layer.grid.set(key, bucket);
      }
      bucket.push(entity);
    }
  }

  getNearby(entity: Entity, maxDistance: number = 200): Entity[] {
    let layerIdx = 0;
    if (maxDistance > 600) layerIdx = 2;
    else if (maxDistance > 200) layerIdx = 1;

    const layer = this.layers[layerIdx];
    const cellSize = layer.cellSize;

    const cx = Math.floor(entity.position.x / cellSize);
    const cy = Math.floor(entity.position.y / cellSize);
    const distSq = maxDistance * maxDistance;

    const nearby: Entity[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(cx + dx, cy + dy);
        const bucket = layer.grid.get(key);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const other = bucket[i];
            if (other === entity) continue;

            const ddx = other.position.x - entity.position.x;
            const ddy = other.position.y - entity.position.y;
            if (ddx * ddx + ddy * ddy <= distSq) {
              nearby.push(other);
            }
          }
        }
      }
    }
    return nearby;
  }

  // ===========================================================================
  // DOD API (new high-performance path)
  // ===========================================================================

  /**
   * Insert by physics world index (DOD style)
   * Reads position directly from PhysicsWorld arrays
   */
  insertByIndex(index: number, world: PhysicsWorld) {
    const posIdx = index * STRIDE_POS;
    const x = world.positions[posIdx];
    const y = world.positions[posIdx + 1];

    for (const layer of this.dodLayers) {
      const cx = Math.floor(x / layer.cellSize);
      const cy = Math.floor(y / layer.cellSize);
      const key = this.getKey(cx, cy);

      let bucket = layer.grid.get(key);
      if (!bucket) {
        bucket = [];
        layer.grid.set(key, bucket);
      }
      bucket.push(index);
    }
  }

  /**
   * Get nearby indices (DOD style)
   * Returns array of physics world indices
   */
  getNearbyIndices(
    index: number,
    world: PhysicsWorld,
    maxDistance: number = 200
  ): number[] {
    let layerIdx = 0;
    if (maxDistance > 600) layerIdx = 2;
    else if (maxDistance > 200) layerIdx = 1;

    const layer = this.dodLayers[layerIdx];
    const cellSize = layer.cellSize;

    const posIdx = index * STRIDE_POS;
    const x = world.positions[posIdx];
    const y = world.positions[posIdx + 1];

    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    const distSq = maxDistance * maxDistance;

    const nearby: number[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(cx + dx, cy + dy);
        const bucket = layer.grid.get(key);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const otherIdx = bucket[i];
            if (otherIdx === index) continue;

            const otherPosIdx = otherIdx * STRIDE_POS;
            const ox = world.positions[otherPosIdx];
            const oy = world.positions[otherPosIdx + 1];
            const ddx = ox - x;
            const ddy = oy - y;

            if (ddx * ddx + ddy * ddy <= distSq) {
              nearby.push(otherIdx);
            }
          }
        }
      }
    }
    return nearby;
  }

  /**
   * Query nearby indices by position (for entities not in DOD grid yet)
   */
  getNearbyIndicesByPosition(
    x: number,
    y: number,
    world: PhysicsWorld,
    maxDistance: number = 200
  ): number[] {
    let layerIdx = 0;
    if (maxDistance > 600) layerIdx = 2;
    else if (maxDistance > 200) layerIdx = 1;

    const layer = this.dodLayers[layerIdx];
    const cellSize = layer.cellSize;

    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    const distSq = maxDistance * maxDistance;

    const nearby: number[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(cx + dx, cy + dy);
        const bucket = layer.grid.get(key);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const otherIdx = bucket[i];
            const otherPosIdx = otherIdx * STRIDE_POS;
            const ox = world.positions[otherPosIdx];
            const oy = world.positions[otherPosIdx + 1];
            const ddx = ox - x;
            const ddy = oy - y;

            if (ddx * ddx + ddy * ddy <= distSq) {
              nearby.push(otherIdx);
            }
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
  private readonly MAX_POOL_SIZE = 100; // Prevent memory leaks

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
    // Only keep particles in pool if under limit
    if (this.pool.length < this.MAX_POOL_SIZE) {
      this.pool.push(particle);
    }
  }

  private createNew(): Particle {
    return {
      id: Math.random().toString(),
      position: { x: 0, y: 0 },
      prevPosition: { x: 0, y: 0 },
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

// =============================================================================
// GAME ENGINE - Central coordination of all DOD systems
// =============================================================================
// Each GameState owns its own engine instance, preventing multi-mount issues.
// All DOD systems are encapsulated here for clean access.

export class GameEngine {
  public spatialGrid: SpatialGrid;
  public particlePool: ParticlePool;
  public physicsWorld: PhysicsWorld;

  constructor() {
    this.spatialGrid = new SpatialGrid();
    this.particlePool = new ParticlePool();
    this.physicsWorld = new PhysicsWorld(MAX_ENTITIES);
  }

  /**
   * Reset all engine systems (for game restart)
   */
  reset(): void {
    this.spatialGrid.clear();
    this.physicsWorld.reset();
  }
}

// Factory function for creating engine instances
export const createGameEngine = (): GameEngine => new GameEngine();

// Module-level references (set at start of each updateGameState call)
let currentEngine: GameEngine | null = null;
let currentSpatialGrid: SpatialGrid | null = null;
let currentPhysicsWorld: PhysicsWorld | null = null;

export const bindEngine = (engine: GameEngine) => {
  currentEngine = engine;
  currentSpatialGrid = engine.spatialGrid;
  currentPhysicsWorld = engine.physicsWorld;
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

/**
 * Get current PhysicsWorld (DOD storage)
 * Use this for direct array access in physics operations
 */
export const getPhysicsWorld = () => {
  if (!currentPhysicsWorld) {
    throw new Error('PhysicsWorld not bound to update loop');
  }
  return currentPhysicsWorld;
};

// Note: PhysicsWorld class is already exported at its definition (line 22)
