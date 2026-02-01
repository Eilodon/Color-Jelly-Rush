import { Player, Bot, Vector2, GameState } from '../../../types';
import { SkillSystem } from '../dod/systems/SkillSystem';

/**
 * Legacy Wrapper for Skill System
 * Redirects to DOD SkillSystem
 */
export const applySkill = (
  entity: Player | Bot,
  targetPos?: Vector2,
  state?: GameState
): boolean => {
  if (!entity || entity.physicsIndex === undefined) return false;

  // Construct input object expected by SkillSystem
  const input = {
    space: true,
    target: targetPos || entity.targetPosition || { x: 0, y: 0 },
  };

  // State is optional in legacy call, but required in DOD?
  // SkillSystem.handleInput signature from OptimizedEngine usage: handleInput(entityId, input, state)
  // Let's assume state is available or handle it.
  // The provided snippet has state as optional param but passes it.

  if (state) {
    SkillSystem.handleInput(entity.physicsIndex, input, state);
    return true;
  }

  return false;
};
