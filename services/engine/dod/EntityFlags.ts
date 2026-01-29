export enum EntityFlags {
    NONE = 0,
    ACTIVE = 1 << 0,
    PLAYER = 1 << 1,
    BOT = 1 << 2,
    FOOD = 1 << 3,
    PROJECTILE = 1 << 4,
    DEAD = 1 << 5,
    OBSTACLE = 1 << 5,

    // Food Subtypes (High bits)
    FOOD_PIGMENT = 1 << 6,
    FOOD_CATALYST = 1 << 7,
    FOOD_SHIELD = 1 << 8,
    FOOD_SOLVENT = 1 << 9,
    FOOD_NEUTRAL = 1 << 10,
}

export const MAX_ENTITIES = 4096;
