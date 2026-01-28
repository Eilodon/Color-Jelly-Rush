import {
  FRICTION_BASE,
  MAX_SPEED_BASE,
  MAX_ENTITY_RADIUS,
} from '../../../constants';
import { Entity, Player, Bot, SizeTier } from '../../../types';
import { getPhysicsWorld, PhysicsWorld } from '../context';

// =============================================================================
// DOD PHYSICS SYSTEM - Pure Data-Oriented Design
// =============================================================================
// All core physics operations work directly on Float32Array via indices.
// OOP wrappers provided for backward compatibility during transition.
// =============================================================================

// Physics constants (inlined for V8 optimization)
const FRICTION = 0.92;
const INTEGRATION_SCALE = 10;
const BASE_MASS_RADIUS = 28;
const STRIDE = 2; // x, y per entity

// =============================================================================
// DOD PHYSICS OPERATIONS - Work directly on PhysicsWorld arrays
// =============================================================================

/**
 * DOD Integration - Physics step for a single entity by index
 * NO Entity object access - purely array operations
 * @param world PhysicsWorld instance
 * @param index Entity's physics index
 * @param dt Delta time
 * @param speedMultiplier Status effect speed multiplier
 */
export const integrateByIndex = (
  world: PhysicsWorld,
  index: number,
  dt: number,
  speedMultiplier: number = 1
): void => {
  // Skip dead entities (flag bit 0 = isDead)
  if (world.flags[index] & 1) return;

  const posIdx = index * STRIDE;

  // 1. Store previous position for render interpolation
  world.prevPositions[posIdx] = world.positions[posIdx];
  world.prevPositions[posIdx + 1] = world.positions[posIdx + 1];

  // 2. Apply friction (direct array mutation - no object creation)
  world.velocities[posIdx] *= FRICTION;
  world.velocities[posIdx + 1] *= FRICTION;

  // 3. Integrate velocity → position
  const scale = dt * INTEGRATION_SCALE;
  world.positions[posIdx] += world.velocities[posIdx] * scale;
  world.positions[posIdx + 1] += world.velocities[posIdx + 1] * scale;

  // 4. Speed clamping (mass-based)
  const vx = world.velocities[posIdx];
  const vy = world.velocities[posIdx + 1];
  const speedSq = vx * vx + vy * vy;

  const mass = world.masses[index];
  const speedScale = 1 / Math.pow(mass, 0.3);
  const maxSpeed = MAX_SPEED_BASE * speedScale * speedMultiplier;
  const maxSpeedSq = maxSpeed * maxSpeed;

  if (speedSq > maxSpeedSq) {
    const speed = Math.sqrt(speedSq);
    const k = maxSpeed / speed;
    world.velocities[posIdx] *= k;
    world.velocities[posIdx + 1] *= k;
  }
};

/**
 * DOD Batch Integration - Process all active entities sequentially
 * Optimal cache locality - SIMD-friendly access pattern
 */
export const integrateBatch = (
  world: PhysicsWorld,
  indices: number[],
  dt: number,
  speedMultipliers: Map<string, number>
): void => {
  const len = indices.length;
  const scale = dt * INTEGRATION_SCALE;

  for (let i = 0; i < len; i++) {
    const index = indices[i];
    if (world.flags[index] & 1) continue; // Skip dead

    const posIdx = index * STRIDE;

    // Store prev
    world.prevPositions[posIdx] = world.positions[posIdx];
    world.prevPositions[posIdx + 1] = world.positions[posIdx + 1];

    // Friction
    world.velocities[posIdx] *= FRICTION;
    world.velocities[posIdx + 1] *= FRICTION;

    // Integrate
    world.positions[posIdx] += world.velocities[posIdx] * scale;
    world.positions[posIdx + 1] += world.velocities[posIdx + 1] * scale;

    // Speed clamp
    const vx = world.velocities[posIdx];
    const vy = world.velocities[posIdx + 1];
    const speedSq = vx * vx + vy * vy;

    const mass = world.masses[index];
    const speedScale = 1 / Math.pow(mass, 0.3);
    const id = world.getId(index);
    const multiplier = speedMultipliers.get(id) || 1;
    const maxSpeed = MAX_SPEED_BASE * speedScale * multiplier;

    if (speedSq > maxSpeed * maxSpeed) {
      const speed = Math.sqrt(speedSq);
      const k = maxSpeed / speed;
      world.velocities[posIdx] *= k;
      world.velocities[posIdx + 1] *= k;
    }
  }
};

/**
 * DOD Map Constraint - Constrain entity to circular boundary by index
 */
export const constrainToMapByIndex = (
  world: PhysicsWorld,
  index: number,
  mapRadius: number
): void => {
  if (world.flags[index] & 1) return;

  const posIdx = index * STRIDE;
  const x = world.positions[posIdx];
  const y = world.positions[posIdx + 1];
  const entityRadius = world.radii[index];

  const distSq = x * x + y * y;
  const boundaryCheck = mapRadius - entityRadius;

  if (distSq > boundaryCheck * boundaryCheck) {
    const dist = Math.sqrt(distSq);
    if (dist > 0.001) {
      const safeR = boundaryCheck;
      const nx = x / dist;
      const ny = y / dist;

      // Clamp position
      world.positions[posIdx] = nx * safeR;
      world.positions[posIdx + 1] = ny * safeR;

      // Bounce velocity
      const vx = world.velocities[posIdx];
      const vy = world.velocities[posIdx + 1];
      const dot = vx * nx + vy * ny;

      if (dot > 0) {
        world.velocities[posIdx] -= dot * nx * 1.5;
        world.velocities[posIdx + 1] -= dot * ny * 1.5;
      }
    }
  }
};

/**
 * DOD Collision Check - Check collision between two entities by index
 * Returns overlap distance if colliding, 0 otherwise
 */
export const checkCollisionByIndex = (
  world: PhysicsWorld,
  indexA: number,
  indexB: number
): number => {
  const posIdxA = indexA * STRIDE;
  const posIdxB = indexB * STRIDE;

  const dx = world.positions[posIdxA] - world.positions[posIdxB];
  const dy = world.positions[posIdxA + 1] - world.positions[posIdxB + 1];
  const distSq = dx * dx + dy * dy;

  const minR = world.radii[indexA] + world.radii[indexB];

  if (distSq < minR * minR) {
    return minR - Math.sqrt(distSq);
  }
  return 0;
};

/**
 * DOD Collision Resolution - Resolve collision with position correction
 */
export const resolveCollisionByIndex = (
  world: PhysicsWorld,
  indexA: number,
  indexB: number
): void => {
  const posIdxA = indexA * STRIDE;
  const posIdxB = indexB * STRIDE;

  const dx = world.positions[posIdxA] - world.positions[posIdxB];
  const dy = world.positions[posIdxA + 1] - world.positions[posIdxB + 1];
  const distSq = dx * dx + dy * dy;

  const minR = world.radii[indexA] + world.radii[indexB];

  if (distSq < minR * minR && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = minR - dist;
    const push = overlap * 0.5;

    const nx = dx / dist;
    const ny = dy / dist;

    // Mass-based push ratio
    const m1 = world.radii[indexA];
    const m2 = world.radii[indexB];
    const total = m1 + m2;
    const r1 = m2 / total;
    const r2 = m1 / total;

    // Position correction
    world.positions[posIdxA] += nx * push * r1;
    world.positions[posIdxA + 1] += ny * push * r1;
    world.positions[posIdxB] -= nx * push * r2;
    world.positions[posIdxB + 1] -= ny * push * r2;
  }
};

// =============================================================================
// OOP WRAPPERS - Backward compatible API (uses PhysicsWorld internally)
// =============================================================================

/**
 * OOP Integration - Wraps DOD integration for Entity objects
 * Syncs entity to PhysicsWorld, runs DOD physics, syncs back
 */
export const integrateEntity = (e: Player | Bot, dt: number) => {
  const world = getPhysicsWorld();
  const speedMultiplier = e.statusEffects?.speedBoost || 1;

  // Sync entity TO physics world
  world.syncFromEntity(e);

  // Get index and run DOD physics
  const index = world.getIndex(e.id);
  if (index === -1) return;

  integrateByIndex(world, index, dt, speedMultiplier);

  // Sync physics world back TO entity (for game logic compatibility)
  world.syncToEntity(e);
};

/**
 * OOP Collision Check - Wraps DOD for backward compatibility
 */
export const checkCollisions = (
  entity: Entity,
  others: Entity[],
  onCollide: (other: Entity) => void
) => {
  const world = getPhysicsWorld();
  const indexA = world.getIndex(entity.id);

  // Fallback to original OOP implementation if entity not in physics world
  if (indexA === -1) {
    checkCollisionsOOP(entity, others, onCollide);
    return;
  }

  const count = others.length;
  for (let i = 0; i < count; i++) {
    const other = others[i];
    if (entity === other) continue;

    const indexB = world.getIndex(other.id);
    if (indexB === -1) {
      // Other entity not in physics world, use OOP check
      const dx = entity.position.x - other.position.x;
      const dy = entity.position.y - other.position.y;
      const distSq = dx * dx + dy * dy;
      const minR = entity.radius + other.radius;

      if (distSq < minR * minR) {
        onCollide(other);
      }
      continue;
    }

    // DOD collision check
    const overlap = checkCollisionByIndex(world, indexA, indexB);
    if (overlap > 0) {
      onCollide(other);

      // Physics response for players/bots
      if (!entity.isDead && !other.isDead && 'score' in other) {
        resolveCollisionByIndex(world, indexA, indexB);
        // Sync back to entities
        world.syncToEntity(entity);
        world.syncToEntity(other);
      }
    }
  }
};

/**
 * Original OOP collision check (fallback)
 */
const checkCollisionsOOP = (
  entity: Entity,
  others: Entity[],
  onCollide: (other: Entity) => void
) => {
  const count = others.length;
  for (let i = 0; i < count; i++) {
    const other = others[i];
    if (entity === other) continue;

    const dx = entity.position.x - other.position.x;
    const dy = entity.position.y - other.position.y;
    const distSq = dx * dx + dy * dy;
    const minR = entity.radius + other.radius;

    if (distSq < minR * minR) {
      onCollide(other);

      const dist = Math.sqrt(distSq);
      if (dist > 0.001 && !entity.isDead && !other.isDead && 'score' in other) {
        const overlap = minR - dist;
        const push = overlap * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;

        const m1 = entity.radius;
        const m2 = other.radius;
        const total = m1 + m2;
        const r1 = m2 / total;

        entity.position.x += nx * push * r1;
        entity.position.y += ny * push * r1;
      }
    }
  }
};

/**
 * OOP Map Constraint - Wraps DOD for backward compatibility
 */
export const constrainToMap = (entity: Entity, radius: number) => {
  const world = getPhysicsWorld();
  const index = world.getIndex(entity.id);

  if (index === -1) {
    // Fallback to OOP implementation
    constrainToMapOOP(entity, radius);
    return;
  }

  // Ensure physics world has latest entity data
  world.syncFromEntity(entity);

  // Run DOD constraint
  constrainToMapByIndex(world, index, radius);

  // Sync back to entity
  world.syncToEntity(entity);
};

/**
 * Original OOP map constraint (fallback)
 */
const constrainToMapOOP = (entity: Entity, radius: number) => {
  const x = entity.position.x;
  const y = entity.position.y;
  const distSq = x * x + y * y;

  if (distSq + entity.radius * entity.radius > radius * radius) {
    const dist = Math.sqrt(distSq);
    if (dist + entity.radius > radius) {
      const angle = Math.atan2(y, x);
      const safeR = radius - entity.radius;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);

      entity.position.x = nx * safeR;
      entity.position.y = ny * safeR;

      const dot = entity.velocity.x * nx + entity.velocity.y * ny;
      if (dot > 0) {
        entity.velocity.x -= dot * nx * 1.5;
        entity.velocity.y -= dot * ny * 1.5;
      }
    }
  }
};

// =============================================================================
// UTILITY FUNCTIONS (unchanged OOP API)
// =============================================================================

export const updateTier = (entity: Player | Bot) => {
  const r = entity.radius;
  if (r < 40) entity.tier = SizeTier.Larva;
  else if (r < 70) entity.tier = SizeTier.Juvenile;
  else if (r < 100) entity.tier = SizeTier.Adult;
  else if (r < 130) entity.tier = SizeTier.Elder;
  else entity.tier = SizeTier.AncientKing;
};

export const applyGrowth = (entity: Player | Bot, amount: number) => {
  const currentArea = Math.PI * entity.radius * entity.radius;
  const newArea = currentArea + amount * 25;
  entity.radius = Math.sqrt(newArea / Math.PI);
  if (entity.radius > MAX_ENTITY_RADIUS) entity.radius = MAX_ENTITY_RADIUS;

  // Sync radius to physics world
  const world = getPhysicsWorld();
  const index = world.getIndex(entity.id);
  if (index !== -1) {
    world.setRadius(index, entity.radius);
  }
};

// =============================================================================
// DOD BATCH OPERATIONS - High performance batch processing
// =============================================================================

/**
 * Batch sync all entities to PhysicsWorld at frame start
 * Call this ONCE at the start of updateGameState
 */
export const syncEntitiesToPhysicsWorld = (
  world: PhysicsWorld,
  entities: Entity[]
): void => {
  const len = entities.length;
  for (let i = 0; i < len; i++) {
    world.syncFromEntity(entities[i]);
  }
};

/**
 * Batch sync PhysicsWorld back to entities after physics update
 * Call this AFTER all physics operations
 */
export const syncPhysicsWorldToEntities = (
  world: PhysicsWorld,
  entities: Entity[]
): void => {
  const len = entities.length;
  for (let i = 0; i < len; i++) {
    world.syncToEntity(entities[i]);
  }
};
