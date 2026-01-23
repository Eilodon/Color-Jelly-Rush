import {
  ACCELERATION_BASE,
  FRICTION_BASE,
  GROWTH_DECAY_END,
  GROWTH_DECAY_START,
  MAP_RADIUS,
  PLAYER_START_RADIUS,
  TRAIL_LENGTH,
  TIER_RADIUS_RANGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  MAX_ENTITY_RADIUS,
} from '../../../constants';
import { FACTION_CONFIG } from '../../../constants';
import { Bot, Faction, GameState, Player, SizeTier, Vector2 } from '../../../types';
import { createRingParticle } from '../effects';

export const applyPhysics = (
  entity: Player | Bot,
  target: Vector2,
  dt: number,
  currentZone: Faction | 'Center',
  state?: GameState
) => {
  if (entity.statusEffects.airborne || entity.statusEffects.rooted > 0) return;

  // PHYSICS 4.0: VECTOR FORCE CONTROL
  // Controls: Direct Force Application (Tighter, Snappier)
  // No more "tank turning". We apply force in the direction of the target.

  const dx = target.x - entity.position.x;
  const dy = target.y - entity.position.y;
  const distToTarget = Math.sqrt(dx * dx + dy * dy);

  // 1. Calculate Stats Modifiers
  // Size Penalty: Less penalty than before for better high-level play
  let sizePenalty = Math.max(0.6, PLAYER_START_RADIUS / Math.max(PLAYER_START_RADIUS, entity.radius * 0.7));
  sizePenalty = Math.min(1, sizePenalty * entity.sizePenaltyMultiplier);

  const surgeBoost = entity.statusEffects.speedSurge > 0 ? 2.0 : 1.0;
  let currentMaxSpeed = entity.maxSpeed * sizePenalty * entity.statusEffects.speedBoost * surgeBoost;
  if (entity.statusEffects.slowed) currentMaxSpeed *= entity.statusEffects.slowMultiplier;

  // Zone Friction
  let friction = FRICTION_BASE;
  if (currentZone === Faction.Water) {
    friction = entity.faction === Faction.Water ? FRICTION_BASE : 0.96;
    if (entity.faction === Faction.Water) currentMaxSpeed *= 1.3;
  } else if (currentZone === Faction.Metal) {
    currentMaxSpeed *= 1.2;
  } else if (currentZone === Faction.Wood) {
    if (entity.faction !== Faction.Wood) currentMaxSpeed *= 0.85;
  }

  // 2. Calculate Force
  const dirX = distToTarget > 0 ? dx / distToTarget : 0;
  const dirY = distToTarget > 0 ? dy / distToTarget : 0;

  let thrust = ACCELERATION_BASE;
  const frameScale = Math.min(2.0, dt * 60);
  const distanceFactor = Math.min(1, distToTarget / 200);
  thrust *= 0.55 + distanceFactor * 0.45;

  // 3. Counter-Thrust (The "Snappy" Factor)
  // If the entity is trying to move opposite to its current velocity, apply EXTRA force.
  const speed = Math.sqrt(entity.velocity.x * entity.velocity.x + entity.velocity.y * entity.velocity.y);
  if (speed > 1) {
    const vX = entity.velocity.x / speed;
    const vY = entity.velocity.y / speed;
    const dot = vX * dirX + vY * dirY; // 1.0 = Same Dir, -1.0 = Opposite Dir

    // If turning sharp or reversing (dot < 0.5), apply massive breaking/turning force
    if (dot < 0.5) {
      thrust *= 1.4;
      friction *= 0.97; // Softer turn assist
    }
  }

  // 4. Apply Force
  entity.velocity.x += dirX * thrust * frameScale;
  entity.velocity.y += dirY * thrust * frameScale;

  // 5. Cap Speed
  const newSpeed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
  if (newSpeed > currentMaxSpeed) {
    const scale = currentMaxSpeed / newSpeed;
    entity.velocity.x *= scale;
    entity.velocity.y *= scale;
  }

  // 6. Apply Friction
  const frictionFactor = Math.pow(friction, frameScale);
  entity.velocity.x *= frictionFactor;
  entity.velocity.y *= frictionFactor;

  // 7. Arrival Damping (Anti-jitter when close to cursor)
  if (distToTarget < 50) {
    const arrivalDamp = Math.pow(0.82, frameScale);
    entity.velocity.x *= arrivalDamp;
    entity.velocity.y *= arrivalDamp;
  }

  // 8. Integration
  entity.position.x += entity.velocity.x;
  entity.position.y += entity.velocity.y;

  // Map Constraints
  const mapCenterX = WORLD_WIDTH / 2;
  const mapCenterY = WORLD_HEIGHT / 2;
  const dxCenter = entity.position.x - mapCenterX;
  const dyCenter = entity.position.y - mapCenterY;
  const distFromCenterSq = dxCenter * dxCenter + dyCenter * dyCenter;
  const mapRadiusSq = MAP_RADIUS * MAP_RADIUS;

  if (distFromCenterSq > mapRadiusSq) {
    const distFromCenter = Math.sqrt(distFromCenterSq);
    const nx = dxCenter / distFromCenter;
    const ny = dyCenter / distFromCenter;
    entity.position.x = mapCenterX + nx * (MAP_RADIUS - 6);
    entity.position.y = mapCenterY + ny * (MAP_RADIUS - 6);

    const outwardSpeed = entity.velocity.x * nx + entity.velocity.y * ny;
    if (outwardSpeed > 0) {
      entity.velocity.x -= nx * outwardSpeed;
      entity.velocity.y -= ny * outwardSpeed;
    }
    entity.velocity.x *= 0.5;
    entity.velocity.y *= 0.5;

    if (state && entity.id === 'player' && outwardSpeed > 2) {
      const config = FACTION_CONFIG[entity.faction];
      state.particles.push(createRingParticle(entity.position.x, entity.position.y, config.stroke, entity.radius * 0.9, 0.35, 2));
      state.shakeIntensity = Math.max(state.shakeIntensity, 0.2);
    }
  }

  if (!entity.trail) entity.trail = [];
  if (newSpeed > 3 && Math.random() > 0.7) {
    entity.trail.unshift({ x: entity.position.x, y: entity.position.y });
    if (entity.trail.length > TRAIL_LENGTH) entity.trail.pop();
  }
};

export const updateTier = (player: Player) => {
  const previousTier = player.tier;
  const progress = (player.radius - PLAYER_START_RADIUS) / TIER_RADIUS_RANGE;
  if (progress < 0.2) player.tier = SizeTier.Larva;
  else if (progress < 0.4) player.tier = SizeTier.Juvenile;
  else if (progress < 0.6) player.tier = SizeTier.Adult;
  else if (progress < 0.8) player.tier = SizeTier.Elder;
  else player.tier = SizeTier.AncientKing;
  return previousTier !== player.tier;
};

export const clampEntityRadius = (entity: Player | Bot) => {
  if ((entity as Bot).isBoss) return;
  if (entity.radius > MAX_ENTITY_RADIUS) entity.radius = MAX_ENTITY_RADIUS;
};

const getGrowthScale = (radius: number) => {
  if (radius <= GROWTH_DECAY_START) return 1;
  if (radius >= GROWTH_DECAY_END) return 0.35;
  const t = (radius - GROWTH_DECAY_START) / (GROWTH_DECAY_END - GROWTH_DECAY_START);
  return 1 - t * 0.65;
};

export const applyGrowth = (entity: Player | Bot, amount: number) => {
  if (amount <= 0) return;
  const scale = getGrowthScale(entity.radius);
  entity.radius += amount * scale;
  clampEntityRadius(entity);
};
