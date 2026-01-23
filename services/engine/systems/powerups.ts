import {
  DIAMOND_SHIELD_VALUE,
  FIRE_ORB_DURATION,
  HEALING_FRUIT_VALUE,
  HEALING_POTION_VALUE,
  ICE_HEART_DURATION,
  MUTATION_CHOICES,
  SWORD_AURA_HITS,
} from '../../../constants';
import { MutationTier, Player, Bot, PowerUp, GameState } from '../../../types';
import { applyMutation, getMutationChoicesByTier } from '../../mutations';
import { createFloatingText } from '../effects';

export const applyPowerUpEffect = (entity: Player | Bot, powerUp: PowerUp, state: GameState) => {
  if (powerUp.type === 'fire_orb') {
    entity.statusEffects.damageBoost = Math.max(entity.statusEffects.damageBoost, 1.3);
    entity.statusEffects.damageBoostTimer = Math.max(entity.statusEffects.damageBoostTimer, FIRE_ORB_DURATION);
    state.floatingTexts.push(createFloatingText(entity.position, 'FIRE ORB', '#fb923c', 16));
  }
  if (powerUp.type === 'healing') {
    entity.currentHealth = Math.min(entity.maxHealth, entity.currentHealth + entity.maxHealth * HEALING_POTION_VALUE);
    state.floatingTexts.push(createFloatingText(entity.position, '+HP', '#4ade80', 16));
  }
  if (powerUp.type === 'ice_heart') {
    entity.statusEffects.speedBoost = Math.max(entity.statusEffects.speedBoost, 1.4);
    entity.statusEffects.speedBoostTimer = Math.max(entity.statusEffects.speedBoostTimer, ICE_HEART_DURATION);
    state.floatingTexts.push(createFloatingText(entity.position, 'ICE HEART', '#7dd3fc', 16));
  }
  if (powerUp.type === 'sword_aura') {
    entity.statusEffects.critCharges = Math.max(entity.statusEffects.critCharges, SWORD_AURA_HITS);
    entity.critChance = Math.max(entity.critChance, 0.2);
    state.floatingTexts.push(createFloatingText(entity.position, 'CRIT!', '#facc15', 16));
  }
  if (powerUp.type === 'diamond_shield') {
    entity.statusEffects.shieldTimer = Math.max(entity.statusEffects.shieldTimer, DIAMOND_SHIELD_VALUE / 10);
    entity.statusEffects.defenseBoost = Math.max(entity.statusEffects.defenseBoost, 1.25);
    entity.statusEffects.defenseBoostTimer = Math.max(entity.statusEffects.defenseBoostTimer, 6);
    state.floatingTexts.push(createFloatingText(entity.position, 'SHIELD', '#fde047', 16));
  }
  if (powerUp.type === 'healing_fruit') {
    entity.currentHealth = Math.min(entity.maxHealth, entity.currentHealth + HEALING_FRUIT_VALUE);
    state.floatingTexts.push(createFloatingText(entity.position, '+FRUIT', '#4ade80', 14));
  }
  if (powerUp.type === 'legendary_orb' && entity.id === 'player') {
    const allowed = state.unlockedMutations?.length ? new Set(state.unlockedMutations) : undefined;
    const choices = getMutationChoicesByTier(new Set(entity.mutations), MutationTier.Legendary, MUTATION_CHOICES, allowed);
    if (choices.length) {
      state.mutationChoices = choices;
      state.isPaused = true;
    }
    state.floatingTexts.push(createFloatingText(entity.position, 'LEGENDARY!', '#f59e0b', 18));
  }
};
