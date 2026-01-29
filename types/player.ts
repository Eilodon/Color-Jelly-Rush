import { Entity, Vector2 } from './entity';
import { SizeTier, MutationTier } from './shared';
export type { SizeTier, MutationTier };
import { PigmentVec3, RingId, Emotion, ShapeId, TattooId } from '../services/cjr/cjrTypes';
import { StatusTimers, StatusMultipliers, StatusScalars } from './status';
import { InputEvent } from './input'; // Import InputEvent chuẩn

// EIDOLON-V: DOD Bridge
// Player and Bot structs are "Hot Objects" synced from DOD Stores.
// They are used for Logic and UI, but Physics happens in PhysicsWorld (WASM/TypedArray).

export function isPlayerOrBot(entity: Entity): entity is Player | Bot {
    return 'score' in entity;
}

export interface Player extends Entity {
    // #region Identity
    name: string;
    score: number;
    kills: number;

    // Dopamine Stats
    killStreak: number;
    streakTimer: number;

    // Core Stats (Sync from DOD StatsStore)
    maxHealth: number;
    currentHealth: number;

    tier: SizeTier;
    targetPosition: Vector2;
    spawnTime: number;

    // #region Logic State
    pigment: PigmentVec3;
    targetPigment: PigmentVec3;
    matchPercent: number;
    ring: RingId;
    emotion: Emotion;
    shape: ShapeId;
    tattoos: TattooId[]; // Keep for UI/Save, but Logic uses TattooStore

    // #region Visual Juice
    aberrationIntensity?: number;
    // #endregion

    // Timers (Should ideally be in DOD, but keeping here for legacy logic compatibility)
    lastHitTime: number;
    lastEatTime: number;
    matchStuckTime: number;
    ring3LowMatchTime: number;
    emotionTimer: number;
    emotionOverride?: Emotion;

    // #region Physics Properties (Read-Only from PhysicsStore)
    acceleration: number;
    maxSpeed: number;
    friction: number;
    magneticFieldRadius: number;
    // #endregion

    // #region RPG Stats (Read-Only from StatsStore/Config)
    defense: number;
    damageMultiplier: number;
    critChance: number;
    critMultiplier: number;
    lifesteal: number;
    armorPen: number;
    reflectDamage: number;
    visionMultiplier: number;
    sizePenaltyMultiplier: number;
    skillCooldownMultiplier: number;
    skillPowerMultiplier: number;
    skillDashMultiplier: number;
    killGrowthMultiplier: number;
    poisonOnHit: boolean;
    doubleCast: boolean;
    reviveAvailable: boolean;
    // #endregion

    // #region Cooldowns & History
    isInvulnerable: boolean;
    skillCooldown: number;
    maxSkillCooldown: number;

    mutationCooldowns: {
        speedSurge: number;
        invulnerable: number;
        rewind: number;
        lightning: number;
        chaos: number;
        kingForm: number;
    };
    // WARNING: Array of Objects. Limit size or use RingBuffer if Logic relies on it heavily.
    rewindHistory: { position: Vector2; health: number; time: number }[];
    stationaryTime: number;
    // #endregion

    // #region Input (Legacy Support)
    /** @deprecated Use InputManager */
    inputs?: { space: boolean; w: boolean };
    /** @deprecated Use InputManager */
    inputEvents?: InputEvent[]; // Strong typing
    /** @deprecated Use InputManager */
    inputSeq?: number;
    // #endregion

    // #region Status (DOD Synced)
    statusFlags: number; // integer
    tattooFlags: number; // integer
    extendedFlags: number; // integer

    statusTimers: StatusTimers;
    statusMultipliers: StatusMultipliers;
    statusScalars: StatusScalars;
    // #endregion
}

export interface Bot extends Player {
    aiState: 'wander' | 'chase' | 'flee' | 'forage';
    targetEntityId: string | null;
    aiReactionTimer: number;
    isCreep?: boolean;
    creepType?: string;
    isElite?: boolean;
    isBoss?: boolean;
    bossAttackTimer?: number;
    bossAttackCharge?: number;
    respawnTimer?: number;
    personality?: 'farmer' | 'hunter' | 'bully' | 'greedy' | 'trickster' | 'rubber';
}

// ... (Profile interfaces giữ nguyên, chúng chỉ dùng cho UI/Save)
export interface TattooChoice {
    id: string;
    name: string;
    tier: MutationTier;
    description: string;
}

export interface MatchSummary {
    score: number;
    kills: number;
    // EIDOLON-V: Added missing fields often used in summary
    rank?: number;
    elapsedTime?: number;
}

export interface PlayerProfile {
    gamesPlayed: number;
    totalKills: number;
    highScore: number;
    unlockedSkins: string[];
    unlockedTattoos: string[];
    cosmetics?: {
        ownedSkins: string[];
        ownedTrails: string[];
        ownedAuras: string[];
        ownedBadges: string[];
        active: {
            skin?: string;
            trail?: string;
            aura?: string;
            badge?: string;
        };
    };
    quests?: {
        daily: Record<string, number>;
        weekly: Record<string, number>;
        lastReset: number;
    };
    guildId?: string | null;
    lastUpdated: number;
}
