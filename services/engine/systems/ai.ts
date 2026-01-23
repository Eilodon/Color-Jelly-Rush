import {
  BOSS_ATTACK_INTERVAL,
  BOSS_DAMAGE,
  ELEMENTAL_ADVANTAGE,
  MAP_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../../constants';
import { Bot, Faction, Food, GameState, Player } from '../../../types';
import { getCurrentSpatialGrid } from '../context';
import { distSq, getZoneCenter, randomRange } from '../math';
import { applyPhysics } from './physics';
import { castSkill } from './skills';
import { createFloatingText } from '../effects';

export const updateBotAI = (bot: Bot, state: GameState, dt: number, currentZone: Faction | 'Center') => {
  bot.aiReactionTimer += dt;
  if (bot.aiReactionTimer < 0.08) {
    applyPhysics(bot, bot.targetPosition, dt, currentZone, state);
    return;
  }
  bot.aiReactionTimer = 0;

  let target = bot.targetPosition;
  let closestThreat: Player | Bot | null = null;
  let closestFood: Food | null = null;
  let closestPrey: Player | Bot | null = null;
  let minDistSq = Infinity;

  const scanRadiusSq = 650 * 650;
  const threatRatio = 1.08;
  const preyRatio = 0.88;
  const counterThreatRatio = 0.95;
  const counterPreyRatio = 1.05;
  const neighbors = getCurrentSpatialGrid().getNearby(bot);

  neighbors.forEach((e) => {
    if (e.id === bot.id || e.isDead) return;

    const isInvulnerable = 'isInvulnerable' in e ? (e as Bot).isInvulnerable : false;
    if (isInvulnerable) return;

    if ('value' in e) {
      const dSq = distSq(bot.position, e.position);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestFood = e as Food;
      }
      return;
    }

    if (!('faction' in e)) return;
    const entity = e as Bot;

    const dSq = distSq(bot.position, entity.position);
    if (dSq > scanRadiusSq) return;

    const ratio = entity.radius / bot.radius;
    const iCounterThem = ELEMENTAL_ADVANTAGE[bot.faction] === entity.faction;
    const theyCounterMe = ELEMENTAL_ADVANTAGE[entity.faction] === bot.faction;

    if (ratio >= threatRatio || (ratio > counterThreatRatio && theyCounterMe)) {
      if (!closestThreat || dSq < distSq(bot.position, closestThreat.position)) closestThreat = entity;
    } else if (ratio <= preyRatio || (ratio < counterPreyRatio && iCounterThem)) {
      if (!closestPrey || dSq < distSq(bot.position, closestPrey.position)) closestPrey = entity;
    }
  });

  if (closestThreat) {
    bot.aiState = 'flee';
    const dx = bot.position.x - closestThreat.position.x;
    const dy = bot.position.y - closestThreat.position.y;
    target = { x: bot.position.x + dx, y: bot.position.y + dy };
    if (bot.skillCooldown <= 0 && distSq(bot.position, closestThreat.position) < 360 * 360) castSkill(bot, state, dt);
  } else if (closestPrey) {
    bot.aiState = 'chase';
    target = {
      x: closestPrey.position.x + closestPrey.velocity.x * 10,
      y: closestPrey.position.y + closestPrey.velocity.y * 10,
    };
    if (bot.skillCooldown <= 0 && distSq(bot.position, closestPrey.position) < 480 * 480) castSkill(bot, state, dt);
  } else if (closestFood) {
    bot.aiState = 'chase';
    target = closestFood.position;
  } else {
    if (Math.random() < 0.2) {
      const homeCenter = getZoneCenter(bot.faction);
      const biasStrength = 0.3;
      const randomX = bot.position.x + randomRange(-400, 400);
      const randomY = bot.position.y + randomRange(-400, 400);

      target = {
        x: randomX * (1 - biasStrength) + homeCenter.x * biasStrength,
        y: randomY * (1 - biasStrength) + homeCenter.y * biasStrength,
      };
    }
  }

  const mapCenterX = WORLD_WIDTH / 2;
  const mapCenterY = WORLD_HEIGHT / 2;
  const distFromMapCenterSq = distSq(target, { x: mapCenterX, y: mapCenterY });

  if (distFromMapCenterSq > state.zoneRadius ** 2 * 0.9 ** 2) {
    target = { x: mapCenterX, y: mapCenterY };
  } else if (distFromMapCenterSq > (MAP_RADIUS * 0.9) ** 2) {
    target = { x: mapCenterX, y: mapCenterY };
  }

  bot.targetPosition = target;
  applyPhysics(bot, target, dt, currentZone, state);
};

export const updateCreepAI = (creep: Bot, state: GameState, dt: number, currentZone: Faction | 'Center') => {
  creep.aiReactionTimer += dt;
  if (creep.aiReactionTimer < 0.2) {
    applyPhysics(creep, creep.targetPosition, dt, currentZone, state);
    return;
  }
  creep.aiReactionTimer = 0;

  let target = creep.targetPosition;
  let closestThreat: Bot | null = null;
  const neighbors = getCurrentSpatialGrid().getNearby(creep);

  neighbors.forEach((e) => {
    if (!('faction' in e) || e.id === creep.id || e.isDead) return;
    const entity = e as Bot;
    if (entity.isInvulnerable) return;
    const ratio = entity.radius / creep.radius;
    if (ratio >= 1.1 && distSq(creep.position, entity.position) < 250 * 250) {
      closestThreat = entity;
    }
  });

  if (closestThreat) {
    const dx = creep.position.x - closestThreat.position.x;
    const dy = creep.position.y - closestThreat.position.y;
    target = { x: creep.position.x + dx, y: creep.position.y + dy };
  } else if (Math.random() < 0.3) {
    const home = getZoneCenter(creep.faction);
    const randomX = creep.position.x + randomRange(-200, 200);
    const randomY = creep.position.y + randomRange(-200, 200);
    target = {
      x: randomX * 0.6 + home.x * 0.4,
      y: randomY * 0.6 + home.y * 0.4,
    };
  }

  creep.targetPosition = target;
  applyPhysics(creep, target, dt, currentZone, state);
};

export const updateBossAI = (boss: Bot, state: GameState, dt: number, currentZone: Faction | 'Center') => {
  if (!boss.bossAttackTimer) boss.bossAttackTimer = BOSS_ATTACK_INTERVAL;
  if (!boss.bossAttackCharge) boss.bossAttackCharge = 0;

  boss.bossAttackTimer -= dt;

  const targets = [state.player, ...state.bots].filter((t) => !t.isDead);
  const nearest = targets.sort((a, b) => distSq(a.position, boss.position) - distSq(b.position, boss.position))[0];

  if (boss.bossAttackTimer <= 0) {
    boss.bossAttackCharge += dt;
    boss.statusEffects.rooted = Math.max(boss.statusEffects.rooted, 0.6);
    if (boss.bossAttackCharge >= 1) {
      const impactRadius = boss.radius * 2.2;
      targets.forEach((target) => {
        if (distSq(target.position, boss.position) < impactRadius * impactRadius) {
          if (target.statusEffects.invulnerable <= 0 && !target.isInvulnerable) {
            target.currentHealth -= BOSS_DAMAGE * boss.damageMultiplier;
            target.statusEffects.invulnerable = 0.8;
            const pushAngle = Math.atan2(target.position.y - boss.position.y, target.position.x - boss.position.x);
            target.velocity.x += Math.cos(pushAngle) * 18;
            target.velocity.y += Math.sin(pushAngle) * 18;
          }
        }
      });
      state.floatingTexts.push(createFloatingText(boss.position, 'BOSS SLAM!', '#ef4444', 24));
      boss.bossAttackCharge = 0;
      boss.bossAttackTimer = BOSS_ATTACK_INTERVAL;
    }
    return;
  }

  if (nearest) {
    boss.targetPosition = {
      x: nearest.position.x,
      y: nearest.position.y,
    };
    applyPhysics(boss, boss.targetPosition, dt, currentZone, state);
  }
};
