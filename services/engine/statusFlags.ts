/**
 * STATUS EFFECT FLAGS - Bitmask System
 * =============================================================================
 * V8 Optimization: Replace dynamic object properties with integer bitmask
 * - No GC overhead from property creation/deletion
 * - Single integer comparison instead of object property lookup
 * - Cache-friendly sequential bit operations
 * =============================================================================
 *
 * Usage:
 *   Add effect:    flags |= StatusFlag.SHIELDED
 *   Remove effect: flags &= ~StatusFlag.SHIELDED
 *   Check effect:  (flags & StatusFlag.SHIELDED) !== 0
 *   Toggle effect: flags ^= StatusFlag.SHIELDED
 */

// =============================================================================
// CORE STATUS FLAGS (Bit 0-15) - Most frequently checked
// =============================================================================
export const StatusFlag = {
  // Combat state (bits 0-7)
  SHIELDED:           1 << 0,   // 0x0001
  BURNING:            1 << 1,   // 0x0002
  SLOWED:             1 << 2,   // 0x0004
  POISONED:           1 << 3,   // 0x0008
  AIRBORNE:           1 << 4,   // 0x0010
  STEALTHED:          1 << 5,   // 0x0020
  ROOTED:             1 << 6,   // 0x0040
  INVULNERABLE:       1 << 7,   // 0x0080

  // Buff state (bits 8-15)
  SPEED_BOOST:        1 << 8,   // 0x0100
  DAMAGE_BOOST:       1 << 9,   // 0x0200
  DEFENSE_BOOST:      1 << 10,  // 0x0400
  REGEN_ACTIVE:       1 << 11,  // 0x0800
  KING_FORM:          1 << 12,  // 0x1000
  OVERDRIVE:          1 << 13,  // 0x2000
  COMMIT_SHIELD:      1 << 14,  // 0x4000
  PITY_BOOST:         1 << 15,  // 0x8000
} as const;

// =============================================================================
// TATTOO EFFECT FLAGS (Bit 16-31) - Tattoo-specific toggles
// =============================================================================
export const TattooFlag = {
  // Tattoo passive effects (bits 16-23)
  CORE_SHIELD_BONUS:      1 << 16,
  PIGMENT_BOMB_ACTIVE:    1 << 17,
  CATALYST_SENSE_ACTIVE:  1 << 18,
  GRIM_HARVEST_ACTIVE:    1 << 19,
  PRISM_GUARD_ACTIVE:     1 << 20,
  WRONG_PIGMENT_REDUCE:   1 << 21,
  PERFECT_MATCH_BONUS:    1 << 22,
  SOLVENT_SPEED_BOOST:    1 << 23,

  // Synergy effects (bits 24-31)
  NEUTRAL_PURIFICATION:   1 << 24,
  OVERDRIVE_EXPLOSIVE:    1 << 25,
  GOLDEN_ATTRACTION:      1 << 26,
  ELEMENTAL_BALANCE:      1 << 27,
  SHIELD_SOLVENT_SYNERGY: 1 << 28,
  COLOR_IMMUNITY:         1 << 29,
  CATALYST_GUARANTEE:     1 << 30,
  NEUTRAL_GOD_MODE:       1 << 31,
} as const;

// =============================================================================
// EXTENDED FLAGS (Second 32-bit integer for overflow)
// =============================================================================
export const ExtendedFlag = {
  KINETIC_EXPLOSION:      1 << 0,
  SHIELD_PIERCING:        1 << 1,
  ABSOLUTE_MASTERY:       1 << 2,
  TEMPORAL_DISTORTION:    1 << 3,
  CATALYST_MASTERY:       1 << 4,
  COLOR_CONTROL:          1 << 5,
} as const;

// Type exports
export type StatusFlagType = typeof StatusFlag[keyof typeof StatusFlag];
export type TattooFlagType = typeof TattooFlag[keyof typeof TattooFlag];
export type ExtendedFlagType = typeof ExtendedFlag[keyof typeof ExtendedFlag];

// =============================================================================
// HELPER FUNCTIONS - Inline-friendly for V8 optimization
// =============================================================================

/**
 * Check if a flag is set
 */
export const hasFlag = (flags: number, flag: number): boolean => {
  return (flags & flag) !== 0;
};

/**
 * Set a flag
 */
export const setFlag = (flags: number, flag: number): number => {
  return flags | flag;
};

/**
 * Clear a flag
 */
export const clearFlag = (flags: number, flag: number): number => {
  return flags & ~flag;
};

/**
 * Toggle a flag
 */
export const toggleFlag = (flags: number, flag: number): number => {
  return flags ^ flag;
};

/**
 * Set flag based on condition
 */
export const setFlagIf = (flags: number, flag: number, condition: boolean): number => {
  return condition ? (flags | flag) : (flags & ~flag);
};

/**
 * Check multiple flags (all must be set)
 */
export const hasAllFlags = (flags: number, mask: number): boolean => {
  return (flags & mask) === mask;
};

/**
 * Check multiple flags (any one set)
 */
export const hasAnyFlag = (flags: number, mask: number): boolean => {
  return (flags & mask) !== 0;
};

/**
 * Count set flags
 */
export const countFlags = (flags: number): number => {
  // Brian Kernighan's algorithm - O(number of set bits)
  let count = 0;
  let n = flags;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
};

// =============================================================================
// COMMON FLAG COMBINATIONS - Pre-computed for hot paths
// =============================================================================
export const FlagMask = {
  // Debuffs that prevent movement
  MOVEMENT_IMPAIRED: StatusFlag.SLOWED | StatusFlag.ROOTED | StatusFlag.AIRBORNE,

  // Damage-over-time effects
  DOT_EFFECTS: StatusFlag.BURNING | StatusFlag.POISONED,

  // Defensive effects
  DEFENSIVE: StatusFlag.SHIELDED | StatusFlag.INVULNERABLE,

  // All combat debuffs
  ALL_DEBUFFS: StatusFlag.BURNING | StatusFlag.SLOWED | StatusFlag.POISONED | StatusFlag.ROOTED,

  // All buffs
  ALL_BUFFS: StatusFlag.SPEED_BOOST | StatusFlag.DAMAGE_BOOST | StatusFlag.DEFENSE_BOOST |
             StatusFlag.REGEN_ACTIVE | StatusFlag.KING_FORM | StatusFlag.OVERDRIVE,
} as const;

// =============================================================================
// TIMER-BASED EFFECTS - These still need numeric values, not bitmasks
// =============================================================================
/**
 * Timer values that accompany the flags
 * When a flag is set, check the corresponding timer
 * When timer expires, clear the flag
 */
export interface StatusTimers {
  burnTimer: number;
  slowTimer: number;
  poisonTimer: number;
  invulnerableTimer: number;
  kingFormTimer: number;
  overdriveTimer: number;
  commitShieldTimer: number;
  pityBoostTimer: number;
  colorBoostTimer: number;
  magnetTimer: number;
  pulseTimer: number;
  tempSpeedTimer: number;
  stealthCharge: number;
  rootedTimer: number;
  speedSurgeTimer: number;
}

/**
 * Multiplier values for status effects
 */
export interface StatusMultipliers {
  speedBoost: number;          // Base speed multiplier
  tempSpeedBoost: number;      // Temporary speed boost
  slowMultiplier: number;      // Slow effect multiplier
  damageBoost: number;         // Damage multiplier
  defenseBoost: number;        // Defense multiplier
  regen: number;               // Regen rate
  colorBoostMultiplier: number;
}

/**
 * Create default status timers (zero-initialized)
 */
export const createDefaultTimers = (): StatusTimers => ({
  burnTimer: 0,
  slowTimer: 0,
  poisonTimer: 0,
  invulnerableTimer: 0,
  kingFormTimer: 0,
  overdriveTimer: 0,
  commitShieldTimer: 0,
  pityBoostTimer: 0,
  colorBoostTimer: 0,
  magnetTimer: 0,
  pulseTimer: 0,
  tempSpeedTimer: 0,
  stealthCharge: 0,
  rootedTimer: 0,
  speedSurgeTimer: 0,
});

/**
 * Create default status multipliers
 */
export const createDefaultMultipliers = (): StatusMultipliers => ({
  speedBoost: 1,
  tempSpeedBoost: 1,
  slowMultiplier: 1,
  damageBoost: 1,
  defenseBoost: 1,
  regen: 0,
  colorBoostMultiplier: 1,
});

// =============================================================================
// MIGRATION HELPERS - Convert between old and new systems
// =============================================================================

/**
 * Convert old statusEffects object to bitmask flags
 * Use during transition period
 */
export const statusEffectsToFlags = (effects: any): number => {
  let flags = 0;

  if (effects.shielded) flags |= StatusFlag.SHIELDED;
  if (effects.burning) flags |= StatusFlag.BURNING;
  if (effects.slowed) flags |= StatusFlag.SLOWED;
  if (effects.poisoned) flags |= StatusFlag.POISONED;
  if (effects.airborne) flags |= StatusFlag.AIRBORNE;
  if (effects.stealthed) flags |= StatusFlag.STEALTHED;
  if (effects.rooted > 0) flags |= StatusFlag.ROOTED;
  if (effects.invulnerable > 0) flags |= StatusFlag.INVULNERABLE;
  if (effects.speedBoost > 1) flags |= StatusFlag.SPEED_BOOST;
  if (effects.damageBoost > 1) flags |= StatusFlag.DAMAGE_BOOST;
  if (effects.defenseBoost > 1) flags |= StatusFlag.DEFENSE_BOOST;
  if (effects.regen > 0) flags |= StatusFlag.REGEN_ACTIVE;
  if (effects.kingForm > 0) flags |= StatusFlag.KING_FORM;
  if ((effects.overdriveTimer || 0) > 0) flags |= StatusFlag.OVERDRIVE;
  if ((effects.commitShield || 0) > 0) flags |= StatusFlag.COMMIT_SHIELD;
  if ((effects.pityBoost || 0) > 0) flags |= StatusFlag.PITY_BOOST;

  return flags;
};

/**
 * Convert old statusEffects to tattoo flags
 */
export const statusEffectsToTattooFlags = (effects: any): number => {
  let flags = 0;

  if (effects.coreShieldBonus) flags |= TattooFlag.CORE_SHIELD_BONUS;
  if (effects.pigmentBombActive) flags |= TattooFlag.PIGMENT_BOMB_ACTIVE;
  if (effects.catalystSenseActive) flags |= TattooFlag.CATALYST_SENSE_ACTIVE;
  if (effects.neutralPurification) flags |= TattooFlag.NEUTRAL_PURIFICATION;
  if (effects.overdriveExplosive) flags |= TattooFlag.OVERDRIVE_EXPLOSIVE;
  if (effects.goldenAttraction) flags |= TattooFlag.GOLDEN_ATTRACTION;
  if (effects.elementalBalance) flags |= TattooFlag.ELEMENTAL_BALANCE;
  if (effects.shieldSolventSynergy) flags |= TattooFlag.SHIELD_SOLVENT_SYNERGY;
  if (effects.colorImmunity) flags |= TattooFlag.COLOR_IMMUNITY;
  if (effects.catalystGuarantee) flags |= TattooFlag.CATALYST_GUARANTEE;
  if (effects.neutralGodMode) flags |= TattooFlag.NEUTRAL_GOD_MODE;

  return flags;
};
