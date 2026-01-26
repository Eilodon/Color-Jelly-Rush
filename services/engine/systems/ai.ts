
import {
  FRICTION_BASE,
  MAP_RADIUS
} from '../../../constants';
import { Bot, Player } from '../../../types/player';
import { GameState } from '../../../types/state';
import { Food } from '../../../types/entity';
import { getCurrentSpatialGrid } from '../context';
import { distance, normalize } from '../math';
import { calcMatchPercent } from '../../cjr/colorMath';
import { applySkill } from './skills';
import { updateBotPersonality, assignRandomPersonality } from '../../cjr/botPersonalities';

export const updateAI = (bot: Bot, state: GameState, dt: number) => {
  if (bot.isDead) return;

  // BOT PERSONALITIES: Use personality-based AI if set
  if (bot.personality && bot.personality !== 'farmer') {
    // Delegate to personality system for hunter/bully/greedy
    // (Farmer uses fallback generic AI below which is similar)
    updateBotPersonality(bot, state, dt);
    return;
  }

  // Fallback: Generic AI (similar to farmer behavior)
  bot.aiReactionTimer -= dt;

  // Decide State occasionally
  if (bot.aiReactionTimer <= 0) {
    bot.aiReactionTimer = 0.2 + Math.random() * 0.3; // Re-think every ~0.3s

    const nearby = getCurrentSpatialGrid().getNearby(bot);

    let targetEntity: Player | Bot | null = null;
    let targetFood: Food | null = null;
    let threat: Player | Bot | null = null;

    let closestThreatDist = Infinity;
    let closestPreyDist = Infinity;
    let bestFoodScore = -Infinity;

    nearby.forEach(e => {
      if (e === bot) return;
      const dist = distance(bot.position, e.position);

      if ('score' in e) { // Agent
        const other = e as unknown as (Player | Bot);
        if (other.isDead) return;

        if (other.radius > bot.radius * 1.1) {
          if (dist < closestThreatDist) {
            closestThreatDist = dist;
            threat = other;
          }
        } else if (bot.radius > other.radius * 1.1) {
          if (dist < closestPreyDist) {
            closestPreyDist = dist;
            targetEntity = other;
          }
        }
      } else if ('value' in e) { // Food
        const f = e as unknown as Food;
        if (f.isDead) return;
        // Score based on distance and COLOR MATCH
        // If pigment matches target, high score.
        let score = 100 / (dist + 10);
        if (f.kind === 'pigment' && f.pigment) {
          // Calculate hypothetical match improvement?
          // Simple heuristic: match % of food vs target.
          const match = calcMatchPercent(f.pigment, bot.targetPigment);
          score *= (1 + match * 2); // Prefer matching colors
        } else if (f.kind === 'catalyst' || f.kind === 'solvent') {
          score *= 1.4;
        } else if (f.kind === 'shield') {
          score *= 1.2;
        }

        if (score > bestFoodScore) {
          bestFoodScore = score;
          targetFood = f;
        }
      }
    });

    // Decision Tree
    if (threat && closestThreatDist < 300) {
      (bot as any).aiState = 'flee';
      (bot as any).targetEntityId = (threat as any).id;

      // Panic Skill
      if (closestThreatDist < 150) {
        applySkill(bot, undefined, state);
      }
    } else if (targetEntity && closestPreyDist < 400) {
      (bot as any).aiState = 'chase';
      (bot as any).targetEntityId = (targetEntity as any).id;

      // Attack Skill (if configured)
      if (closestPreyDist < 150) {
        applySkill(bot, undefined, state);
      }
    } else if (targetFood) {
      (bot as any).aiState = 'forage';
      // Move to food
      // We don't store food ID in targetEntityId usually, just move logic below
    } else {
      (bot as any).aiState = 'wander';
    }

    // Execute Movement - EIDOLON-V FIX: Zero allocation vector math
    const speed = bot.maxSpeed;
    let tx = 0, ty = 0;

    if (bot.aiState === 'flee' && threat) {
      // EIDOLON-V FIX: Direct math, no object allocation
      const dx = (bot as any).position.x - (threat as any).position.x;
      const dy = (bot as any).position.y - (threat as any).position.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > 0.001) {
        const invDist = 1.0 / Math.sqrt(distSq);
        tx = dx * invDist * speed;
        ty = dy * invDist * speed;
      }
    } else if (bot.aiState === 'chase' && targetEntity) {
      // EIDOLON-V FIX: Direct math, no object allocation
      const dx = (targetEntity as any).position.x - (bot as any).position.x;
      const dy = (targetEntity as any).position.y - (bot as any).position.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > 0.001) {
        const invDist = 1.0 / Math.sqrt(distSq);
        tx = dx * invDist * speed;
        ty = dy * invDist * speed;
      }
    } else if (bot.aiState === 'forage' && targetFood) {
      // EIDOLON-V FIX: Direct math, no object allocation
      const dx = (targetFood as any).position.x - (bot as any).position.x;
      const dy = (targetFood as any).position.y - (bot as any).position.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > 0.001) {
        const invDist = 1.0 / Math.sqrt(distSq);
        tx = dx * invDist * speed;
        ty = dy * invDist * speed;
      }
    } else {
      // Wander Center bias
      const botX = (bot as any).position.x;
      const botY = (bot as any).position.y;
      const distCenterSq = botX * botX + botY * botY;
      
      if (distCenterSq > (MAP_RADIUS * 0.9) * (MAP_RADIUS * 0.9)) {
        // EIDOLON-V FIX: Direct math for center bias
        const dist = Math.sqrt(distCenterSq);
        const invDist = 1.0 / dist;
        tx = -botX * invDist * speed;
        ty = -botY * invDist * speed;
      } else {
        tx = (Math.random() - 0.5) * speed;
        ty = (Math.random() - 0.5) * speed;
      }
    }

    // In Physics 2.0 we set Acceleration (Force), not Velocity directly, theoretically.
    // But physics.ts currently clamps velocity and applies drag.
    // So setting velocity here acts as "Self-Propulsion".
    // To respect inertia, we should ADD to velocity, not set it.

    // Steering Behavior (Seek)
    const desiredX = tx;
    const desiredY = ty;

    const steerX = desiredX - bot.velocity.x;
    const steerY = desiredY - bot.velocity.y;

    // Apply steering force
    const steerFactor = 0.1; // Turn speed
    bot.velocity.x += steerX * steerFactor;
    bot.velocity.y += steerY * steerFactor;
  }
};
