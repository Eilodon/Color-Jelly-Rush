/**
 * @cjr/engine - CJR Types
 * Pure type definitions - zero dependencies
 */

export type PigmentVec3 = {
    r: number;
    g: number;
    b: number;
};

export type RingId = 1 | 2 | 3;

export type Emotion =
    | 'happy'
    | 'hungry'
    | 'yum'
    | 'greed'
    | 'focus'
    | 'panic'
    | 'despair'
    | 'victory'
    | 'ko';

export type PickupKind = 'pigment' | 'neutral' | 'solvent' | 'catalyst' | 'shield' | 'candy_vein';

export type ShapeId = 'circle' | 'square' | 'triangle' | 'hex';

export enum TattooId {
    // Legacy / Advanced Tattoos
    FilterInk = 'filter_ink',
    Overdrive = 'overdrive',
    DepositShield = 'deposit_shield',
    PigmentBomb = 'pigment_bomb',
    PerfectMatch = 'perfect_match',
    CatalystSense = 'catalyst_sense',
    NeutralMastery = 'neutral_mastery',
    SolventExpert = 'solvent_expert',
    CatalystEcho = 'catalyst_echo',
    PrismGuard = 'prism_guard',
    InkLeech = 'ink_leech',
    GrimHarvest = 'grim_harvest',

    // Foundation / Prototype Tattoos
    SpeedSurge = 'speed_surge',
    Invulnerable = 'invulnerable',
    Rewind = 'rewind',
    Lightning = 'lightning',
    Chaos = 'chaos',
    KingForm = 'king_form',
    Magnet = 'magnet',
    Dash = 'dash',
    Bump = 'bump',
    Pierce = 'pierce',
}

export enum MutationTier {
    Common = 'common',
    Rare = 'rare',
    Epic = 'epic',
    Legendary = 'legendary',
}

/**
 * Numeric IDs for TattooId enum values.
 * Used for network serialization to avoid charCodeAt collision.
 * (e.g., PigmentBomb, PerfectMatch, PrismGuard, Pierce all start with 'p')
 */
export const TATTOO_NUMERIC_ID: Record<TattooId, number> = {
    [TattooId.FilterInk]: 1,
    [TattooId.Overdrive]: 2,
    [TattooId.DepositShield]: 3,
    [TattooId.PigmentBomb]: 4,
    [TattooId.PerfectMatch]: 5,
    [TattooId.CatalystSense]: 6,
    [TattooId.NeutralMastery]: 7,
    [TattooId.SolventExpert]: 8,
    [TattooId.CatalystEcho]: 9,
    [TattooId.PrismGuard]: 10,
    [TattooId.InkLeech]: 11,
    [TattooId.GrimHarvest]: 12,
    [TattooId.SpeedSurge]: 13,
    [TattooId.Invulnerable]: 14,
    [TattooId.Rewind]: 15,
    [TattooId.Lightning]: 16,
    [TattooId.Chaos]: 17,
    [TattooId.KingForm]: 18,
    [TattooId.Magnet]: 19,
    [TattooId.Dash]: 20,
    [TattooId.Bump]: 21,
    [TattooId.Pierce]: 22,
};

/**
 * Reverse lookup: Numeric ID → TattooId
 */
export const TATTOO_BY_NUMERIC_ID: Record<number, TattooId> = Object.fromEntries(
    Object.entries(TATTOO_NUMERIC_ID).map(([k, v]) => [v, k as TattooId])
) as Record<number, TattooId>;
