import { RingId } from "./cjrTypes";

export const RING_RADII = {
    R1: 1600, // Outer Rim
    R2: 1000, // The Arena
    R3: 400,  // Death Zone
    CENTER: 100
};

export const THRESHOLDS = {
    ENTER_R2: 0.50, // 50% match
    ENTER_R3: 0.70, // 70% match
    WIN_HOLD: 0.90,  // 90% match to channel win

    // Legacy Aliases
    ENTER_RING2: 0.50,
    ENTER_RING3: 0.70
};

export const WAVE_CONFIG = {
    INTERVAL: {
        [1 as RingId]: 8000,
        [2 as RingId]: 10000,
        [3 as RingId]: 14000,
    },
    INTERVAL_R1: 8000,
    INTERVAL_R2: 10000,
    INTERVAL_R3: 14000,
    SPAWN_WEIGHTS: {
        pigment: 0.60,
        neutral: 0.25,
        special: 0.15
    },
    SPAWN_COUNTS: {
        R1: 5,
        R2: 4,
        R3: 3
    }
};

export const WAVE_CONFIGS = WAVE_CONFIG;

export const COMMIT_BUFFS = {
    R2: { shield: 3.0, speed: 1.1, duration: 2.0 },
    R3: { shield: 5.0, speed: 1.2, duration: 3.0 }
};

export const BOSS_CONFIGS = {
    BOSS_1_TRIGGER: 'RING_2_ACTIVE',
    BOSS_2_TRIGGER: 'RING_3_ACTIVE',
};

export const COLOR_PALETTE = {
    background: '#111111',
    rings: {
        r1: '#475569', // Slate
        r2: '#3b82f6', // Blue
        r3: '#ef4444'  // Red
    }
};
