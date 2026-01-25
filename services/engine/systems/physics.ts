import {
  FRICTION_BASE,
  MAX_SPEED_BASE,
  MAX_ENTITY_RADIUS,
} from '../../../constants';
import { Entity, Player, Bot, SizeTier } from '../../../types';

/**
 * PHASE 1: DIRECT ENTITY INTEGRATION (The Cure)
 * Removes the need for a separate PhysicsWorld and syncing.
 * Mutates Entity state directly.
 */

export const integrateEntity = (e: Player | Bot, dt: number) => {
  // 1. Friction / Drag
  // Use fixed time step assumption for determinism if possible, but here we use dt
  const friction = Math.pow(FRICTION_BASE, dt * 60);

  e.velocity.x *= friction;
  e.velocity.y *= friction;

  // 2. Integration
  e.position.x += e.velocity.x * dt * 10; // Scaling factor preserved from legacy
  e.position.y += e.velocity.y * dt * 10;

  // 3. Max Speed Clamp (Soft Cap)
  const speedSq = e.velocity.x * e.velocity.x + e.velocity.y * e.velocity.y;
  // Calculate Cap
  const BASE_MASS_RADIUS = 28;
  const mass = Math.max(1, Math.pow(e.radius / BASE_MASS_RADIUS, 1.5));
  const speedScale = 1 / Math.pow(mass, 0.3);
  const speedMultiplier = (e.statusEffects?.speedBoost || 1);
  const maxSpeed = MAX_SPEED_BASE * speedScale * speedMultiplier;

  if (speedSq > maxSpeed * maxSpeed) {
    const speed = Math.sqrt(speedSq);
    const k = maxSpeed / speed;
    e.velocity.x *= k;
    e.velocity.y *= k;
  }
};

/**
 * Resolves collisions using simple impulse or position correction.
 * Should be called AFTER integration.
 */
export const checkCollisions = (
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
    // Squared check first
    const distSq = dx * dx + dy * dy;
    const minR = entity.radius + other.radius;

    if (distSq < minR * minR) {
      onCollide(other);

      // Physics Response (Push)
      const dist = Math.sqrt(distSq);
      if (dist > 0.001 && !entity.isDead && !other.isDead && 'score' in other) {
        const overlap = minR - dist;
        const push = overlap * 0.5; // Split overlap correction
        const nx = dx / dist;
        const ny = dy / dist;

        // Mass ratio
        const m1 = entity.radius;
        const m2 = other.radius;
        const total = m1 + m2;
        const r1 = m2 / total; // Inverse mass share

        // Position Correction (Verlet-ish)
        entity.position.x += nx * push * r1;
        entity.position.y += ny * push * r1;
      }
    }
  }
};

export const constrainToMap = (entity: Entity, radius: number) => {
  const x = entity.position.x;
  const y = entity.position.y;
  const distSq = x * x + y * y; // Optimization: avoid sqrt if inside

  if (distSq + entity.radius * entity.radius > radius * radius) {
    // Approximation check failed, do precise
    const dist = Math.sqrt(distSq);
    if (dist + entity.radius > radius) {
      const angle = Math.atan2(y, x);
      const safeR = radius - entity.radius;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);

      entity.position.x = nx * safeR;
      entity.position.y = ny * safeR;

      // Bounce velocity
      const dot = entity.velocity.x * nx + entity.velocity.y * ny;
      if (dot > 0) {
        entity.velocity.x -= dot * nx * 1.5; // 1.5 bounce
        entity.velocity.y -= dot * ny * 1.5;
      }
    }
  }
};

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
};

// Removed: updatePhysicsWorld, applyPhysics (Legacy)
