/**
 * @cjr/engine - ComponentStores
 * Data-Oriented Design stores using TypedArrays
 * Zero dependencies - headless compatible
 *
 * EIDOLON-V REFACTOR: Dual API pattern
 * - *Store classes: Static API using defaultWorld (backward compatible)
 * - *Access classes: Instance-based API using WorldState injection (new)
 */

import { EntityFlags, MAX_ENTITIES } from './EntityFlags';
import { WorldState, defaultWorld, STRIDES } from './WorldState';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isValidEntityId(id: number): boolean {
    return id >= 0 && id < MAX_ENTITIES;
}

// =============================================================================
// TRANSFORM ACCESS (Instance-based)
// =============================================================================

export class TransformAccess {
    static readonly STRIDE = STRIDES.TRANSFORM;

    static set(world: WorldState, id: number, x: number, y: number, rotation: number, scale: number = 1.0): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.TRANSFORM;
        const data = world.transform;
        data[idx] = x;
        data[idx + 1] = y;
        data[idx + 2] = rotation;
        data[idx + 3] = scale;
        // Initialize prev values to prevent interpolation glitch on spawn
        data[idx + 4] = x;
        data[idx + 5] = y;
        data[idx + 6] = rotation;
    }

    static setPosition(world: WorldState, id: number, x: number, y: number): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.TRANSFORM;
        world.transform[idx] = x;
        world.transform[idx + 1] = y;
    }

    static getX(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.transform[id * STRIDES.TRANSFORM];
    }

    static getY(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.transform[id * STRIDES.TRANSFORM + 1];
    }

    static getRotation(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.transform[id * STRIDES.TRANSFORM + 2];
    }

    static getScale(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 1;
        return world.transform[id * STRIDES.TRANSFORM + 3];
    }
}

// =============================================================================
// PHYSICS ACCESS (Instance-based)
// =============================================================================

export class PhysicsAccess {
    static readonly STRIDE = STRIDES.PHYSICS;

    static set(
        world: WorldState,
        id: number,
        vx: number,
        vy: number,
        mass: number,
        radius: number,
        restitution: number = 0.5,
        friction: number = 0.9
    ): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PHYSICS;
        const data = world.physics;
        data[idx] = vx;
        data[idx + 1] = vy;
        data[idx + 2] = 0; // vRotation
        data[idx + 3] = mass;
        data[idx + 4] = radius;
        data[idx + 5] = restitution;
        data[idx + 6] = friction;
    }

    static setVelocity(world: WorldState, id: number, vx: number, vy: number): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PHYSICS;
        world.physics[idx] = vx;
        world.physics[idx + 1] = vy;
    }

    static getVelocityX(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.physics[id * STRIDES.PHYSICS];
    }

    static getVelocityY(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.physics[id * STRIDES.PHYSICS + 1];
    }

    static getRadius(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.physics[id * STRIDES.PHYSICS + 4];
    }

    static getMass(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.physics[id * STRIDES.PHYSICS + 3];
    }
}

// =============================================================================
// STATE ACCESS (Instance-based)
// =============================================================================

export class StateAccess {
    static setFlag(world: WorldState, id: number, flag: EntityFlags): void {
        if (!world.isValidEntityId(id)) return;
        world.stateFlags[id] |= flag;
    }

    static clearFlag(world: WorldState, id: number, flag: EntityFlags): void {
        if (!world.isValidEntityId(id)) return;
        world.stateFlags[id] &= ~flag;
    }

    static hasFlag(world: WorldState, id: number, flag: EntityFlags): boolean {
        if (!world.isValidEntityId(id)) return false;
        return (world.stateFlags[id] & flag) === flag;
    }

    static isActive(world: WorldState, id: number): boolean {
        if (!world.isValidEntityId(id)) return false;
        return (world.stateFlags[id] & EntityFlags.ACTIVE) !== 0;
    }
}

// =============================================================================
// STATS ACCESS (Instance-based)
// =============================================================================

export class StatsAccess {
    static readonly STRIDE = STRIDES.STATS;

    static set(
        world: WorldState,
        id: number,
        currentHealth: number,
        maxHealth: number,
        score: number,
        matchPercent: number,
        defense: number = 1,
        damageMultiplier: number = 1
    ): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.STATS;
        const data = world.stats;
        data[idx] = currentHealth;
        data[idx + 1] = maxHealth;
        data[idx + 2] = score;
        data[idx + 3] = matchPercent;
        data[idx + 4] = defense;
        data[idx + 5] = damageMultiplier;
    }

    static getCurrentHealth(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.stats[id * STRIDES.STATS];
    }

    static getMaxHealth(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.stats[id * STRIDES.STATS + 1];
    }

    static getScore(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.stats[id * STRIDES.STATS + 2];
    }

    static getMatchPercent(world: WorldState, id: number): number {
        if (!world.isValidEntityId(id)) return 0;
        return world.stats[id * STRIDES.STATS + 3];
    }

    static setCurrentHealth(world: WorldState, id: number, value: number): void {
        if (!world.isValidEntityId(id)) return;
        world.stats[id * STRIDES.STATS] = value;
    }

    static setMaxHealth(world: WorldState, id: number, value: number): void {
        if (!world.isValidEntityId(id)) return;
        world.stats[id * STRIDES.STATS + 1] = value;
    }
}

// =============================================================================
// SKILL ACCESS (Instance-based)
// =============================================================================

export class SkillAccess {
    static readonly STRIDE = STRIDES.SKILL;

    static set(world: WorldState, id: number, cooldown: number, maxCooldown: number, activeTimer: number, shapeId: number = 0): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.SKILL;
        const data = world.skills;
        data[idx] = cooldown;
        data[idx + 1] = maxCooldown;
        data[idx + 2] = activeTimer;
        data[idx + 3] = shapeId;
    }

    static getCooldown(world: WorldState, id: number): number {
        return world.skills[id * STRIDES.SKILL];
    }

    static setCooldown(world: WorldState, id: number, value: number): void {
        world.skills[id * STRIDES.SKILL] = value;
    }

    static getMaxCooldown(world: WorldState, id: number): number {
        return world.skills[id * STRIDES.SKILL + 1];
    }

    static setMaxCooldown(world: WorldState, id: number, value: number): void {
        world.skills[id * STRIDES.SKILL + 1] = value;
    }

    static getActiveTimer(world: WorldState, id: number): number {
        return world.skills[id * STRIDES.SKILL + 2];
    }

    static setActiveTimer(world: WorldState, id: number, value: number): void {
        world.skills[id * STRIDES.SKILL + 2] = value;
    }
}

// =============================================================================
// CONFIG ACCESS (Instance-based)
// =============================================================================

export class ConfigAccess {
    static readonly STRIDE = STRIDES.CONFIG;

    static set(
        world: WorldState,
        id: number,
        magneticRadius: number,
        damageMult: number,
        speedMult: number,
        pickupRange: number,
        visionRange: number
    ): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.CONFIG;
        const data = world.config;
        data[idx] = magneticRadius;
        data[idx + 1] = damageMult;
        data[idx + 2] = speedMult;
        data[idx + 3] = pickupRange;
        data[idx + 4] = visionRange;
    }

    static getMagneticRadius(world: WorldState, id: number): number {
        return world.config[id * STRIDES.CONFIG];
    }

    static getSpeedMultiplier(world: WorldState, id: number): number {
        return world.config[id * STRIDES.CONFIG + 2] || 1;
    }

    static getMaxSpeed(world: WorldState, id: number): number {
        return 150 * (world.config[id * STRIDES.CONFIG + 2] || 1);
    }

    static setSpeedMultiplier(world: WorldState, id: number, value: number): void {
        world.config[id * STRIDES.CONFIG + 2] = value;
    }

    static setMaxSpeed(world: WorldState, id: number, value: number): void {
        world.config[id * STRIDES.CONFIG + 2] = value / 150;
    }

    static setMagnetRadius(world: WorldState, id: number, value: number): void {
        world.config[id * STRIDES.CONFIG] = value;
    }
}

// =============================================================================
// INPUT ACCESS (Instance-based)
// =============================================================================

export class InputAccess {
    static readonly STRIDE = STRIDES.INPUT;

    static setTarget(world: WorldState, id: number, x: number, y: number): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.INPUT;
        world.input[idx] = x;
        world.input[idx + 1] = y;
    }

    static getTarget(world: WorldState, id: number, out: { x: number; y: number }): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.INPUT;
        out.x = world.input[idx];
        out.y = world.input[idx + 1];
    }

    static setAction(world: WorldState, id: number, bit: number, active: boolean): void {
        if (!world.isValidEntityId(id)) return;
        if (bit < 0 || bit > 31) return;
        const idx = id * STRIDES.INPUT + 2;
        const bitMask = 1 << bit;
        world.input[idx] = active ? (world.input[idx] | bitMask) : (world.input[idx] & ~bitMask);
    }

    static isActionActive(world: WorldState, id: number, actionBit: number): boolean {
        const idx = id * STRIDES.INPUT + 2;
        return (world.input[idx] & (1 << actionBit)) !== 0;
    }

    static consumeAction(world: WorldState, id: number, actionBit: number): boolean {
        const idx = id * STRIDES.INPUT + 2;
        const mask = 1 << actionBit;
        if ((world.input[idx] & mask) !== 0) {
            world.input[idx] &= ~mask;
            return true;
        }
        return false;
    }

    static getActions(world: WorldState, id: number): number {
        return world.input[id * STRIDES.INPUT + 2];
    }

    static setActions(world: WorldState, id: number, actions: number): void {
        world.input[id * STRIDES.INPUT + 2] = actions;
    }
}

// =============================================================================
// PIGMENT ACCESS (Instance-based)
// =============================================================================

export class PigmentAccess {
    static readonly STRIDE = STRIDES.PIGMENT;
    static readonly R = 0;
    static readonly G = 1;
    static readonly B = 2;
    static readonly TARGET_R = 3;
    static readonly TARGET_G = 4;
    static readonly TARGET_B = 5;
    static readonly MATCH = 6;
    static readonly COLOR_INT = 7;

    static init(
        world: WorldState,
        id: number,
        r: number, g: number, b: number,
        targetR: number, targetG: number, targetB: number
    ): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PIGMENT;
        const data = world.pigment;
        data[idx + PigmentAccess.R] = r;
        data[idx + PigmentAccess.G] = g;
        data[idx + PigmentAccess.B] = b;
        data[idx + PigmentAccess.TARGET_R] = targetR;
        data[idx + PigmentAccess.TARGET_G] = targetG;
        data[idx + PigmentAccess.TARGET_B] = targetB;
        PigmentAccess.updateMatch(world, id);
        PigmentAccess.updateColorInt(world, id);
    }

    static set(world: WorldState, id: number, r: number, g: number, b: number): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PIGMENT;
        const data = world.pigment;
        data[idx + PigmentAccess.R] = r;
        data[idx + PigmentAccess.G] = g;
        data[idx + PigmentAccess.B] = b;
        PigmentAccess.updateMatch(world, id);
        PigmentAccess.updateColorInt(world, id);
    }

    static mix(world: WorldState, id: number, addR: number, addG: number, addB: number, ratio: number): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PIGMENT;
        const data = world.pigment;
        data[idx + PigmentAccess.R] += (addR - data[idx + PigmentAccess.R]) * ratio;
        data[idx + PigmentAccess.G] += (addG - data[idx + PigmentAccess.G]) * ratio;
        data[idx + PigmentAccess.B] += (addB - data[idx + PigmentAccess.B]) * ratio;
        // Clamp
        data[idx + PigmentAccess.R] = Math.max(0, Math.min(1, data[idx + PigmentAccess.R]));
        data[idx + PigmentAccess.G] = Math.max(0, Math.min(1, data[idx + PigmentAccess.G]));
        data[idx + PigmentAccess.B] = Math.max(0, Math.min(1, data[idx + PigmentAccess.B]));
        PigmentAccess.updateMatch(world, id);
        PigmentAccess.updateColorInt(world, id);
    }

    static updateMatch(world: WorldState, id: number): void {
        const idx = id * STRIDES.PIGMENT;
        const data = world.pigment;
        const dr = data[idx + PigmentAccess.R] - data[idx + PigmentAccess.TARGET_R];
        const dg = data[idx + PigmentAccess.G] - data[idx + PigmentAccess.TARGET_G];
        const db = data[idx + PigmentAccess.B] - data[idx + PigmentAccess.TARGET_B];
        const distSq = dr * dr + dg * dg + db * db;
        const thresholdSq = 0.09;
        data[idx + PigmentAccess.MATCH] = distSq >= thresholdSq ? 0 : 1.0 - distSq / thresholdSq;
    }

    static updateColorInt(world: WorldState, id: number): void {
        const idx = id * STRIDES.PIGMENT;
        const data = world.pigment;
        const r = Math.max(0, Math.min(255, Math.floor(data[idx + PigmentAccess.R] * 255)));
        const g = Math.max(0, Math.min(255, Math.floor(data[idx + PigmentAccess.G] * 255)));
        const b = Math.max(0, Math.min(255, Math.floor(data[idx + PigmentAccess.B] * 255)));
        data[idx + PigmentAccess.COLOR_INT] = (r << 16) | (g << 8) | b;
    }

    static getPigment(world: WorldState, id: number): { r: number; g: number; b: number } {
        const idx = id * STRIDES.PIGMENT;
        return {
            r: world.pigment[idx + PigmentAccess.R],
            g: world.pigment[idx + PigmentAccess.G],
            b: world.pigment[idx + PigmentAccess.B],
        };
    }

    static getMatch(world: WorldState, id: number): number {
        return world.pigment[id * STRIDES.PIGMENT + PigmentAccess.MATCH];
    }

    static getColorInt(world: WorldState, id: number): number {
        return world.pigment[id * STRIDES.PIGMENT + PigmentAccess.COLOR_INT];
    }
}

// =============================================================================
// TATTOO ACCESS (Instance-based)
// =============================================================================

export class TattooAccess {
    static readonly STRIDE = STRIDES.TATTOO;

    static set(world: WorldState, id: number, flags: number, procChance: number): void {
        if (!world.isValidEntityId(id)) return;
        world.tattooFlags[id] = flags;
        const idx = id * STRIDES.TATTOO;
        world.tattoo[idx] = 0; // timer1
        world.tattoo[idx + 1] = 0; // timer2
        world.tattoo[idx + 2] = procChance;
    }

    static getFlags(world: WorldState, id: number): number {
        return world.tattooFlags[id];
    }

    static hasFlag(world: WorldState, id: number, flag: number): boolean {
        return (world.tattooFlags[id] & flag) !== 0;
    }
}

// =============================================================================
// PROJECTILE ACCESS (Instance-based)
// =============================================================================

export class ProjectileAccess {
    static readonly STRIDE = STRIDES.PROJECTILE;

    static set(world: WorldState, id: number, ownerId: number, damage: number, duration: number, typeId: number = 0): void {
        if (!world.isValidEntityId(id)) return;
        const idx = id * STRIDES.PROJECTILE;
        const data = world.projectile;
        data[idx] = ownerId;
        data[idx + 1] = damage;
        data[idx + 2] = duration;
        data[idx + 3] = typeId;
    }

    static getOwnerId(world: WorldState, id: number): number {
        return world.projectile[id * STRIDES.PROJECTILE];
    }

    static getDamage(world: WorldState, id: number): number {
        return world.projectile[id * STRIDES.PROJECTILE + 1];
    }

    static getDuration(world: WorldState, id: number): number {
        return world.projectile[id * STRIDES.PROJECTILE + 2];
    }
}

// =============================================================================
// =============================================================================
// BACKWARD COMPATIBLE STATIC STORES (use defaultWorld)
// =============================================================================
// =============================================================================

// =============================================================================
// TRANSFORM STORE (Static - Backward Compatible)
// =============================================================================

export class TransformStore {
    public static readonly STRIDE = STRIDES.TRANSFORM;
    public static readonly data = defaultWorld.transform;

    static set(id: number, x: number, y: number, rotation: number, scale: number = 1.0): void {
        TransformAccess.set(defaultWorld, id, x, y, rotation, scale);
    }

    static setPosition(id: number, x: number, y: number): void {
        TransformAccess.setPosition(defaultWorld, id, x, y);
    }

    static getX(id: number): number {
        return TransformAccess.getX(defaultWorld, id);
    }

    static getY(id: number): number {
        return TransformAccess.getY(defaultWorld, id);
    }
}

// =============================================================================
// PHYSICS STORE (Static - Backward Compatible)
// =============================================================================

export class PhysicsStore {
    public static readonly STRIDE = STRIDES.PHYSICS;
    public static readonly data = defaultWorld.physics;

    static set(
        id: number,
        vx: number,
        vy: number,
        mass: number,
        radius: number,
        restitution: number = 0.5,
        friction: number = 0.9
    ): void {
        PhysicsAccess.set(defaultWorld, id, vx, vy, mass, radius, restitution, friction);
    }

    static setVelocity(id: number, vx: number, vy: number): void {
        PhysicsAccess.setVelocity(defaultWorld, id, vx, vy);
    }

    static getVelocityX(id: number): number {
        return PhysicsAccess.getVelocityX(defaultWorld, id);
    }

    static getVelocityY(id: number): number {
        return PhysicsAccess.getVelocityY(defaultWorld, id);
    }

    static getRadius(id: number): number {
        return PhysicsAccess.getRadius(defaultWorld, id);
    }
}

// =============================================================================
// STATE STORE (Static - Backward Compatible)
// =============================================================================

export class StateStore {
    public static readonly flags = defaultWorld.stateFlags;

    static setFlag(id: number, flag: EntityFlags): void {
        StateAccess.setFlag(defaultWorld, id, flag);
    }

    static clearFlag(id: number, flag: EntityFlags): void {
        StateAccess.clearFlag(defaultWorld, id, flag);
    }

    static hasFlag(id: number, flag: EntityFlags): boolean {
        return StateAccess.hasFlag(defaultWorld, id, flag);
    }

    static isActive(id: number): boolean {
        return StateAccess.isActive(defaultWorld, id);
    }
}

// =============================================================================
// STATS STORE (Static - Backward Compatible)
// =============================================================================

export class StatsStore {
    public static readonly STRIDE = STRIDES.STATS;
    public static readonly data = defaultWorld.stats;

    static set(
        id: number,
        currentHealth: number,
        maxHealth: number,
        score: number,
        matchPercent: number,
        defense: number = 1,
        damageMultiplier: number = 1
    ): void {
        StatsAccess.set(defaultWorld, id, currentHealth, maxHealth, score, matchPercent, defense, damageMultiplier);
    }

    static setDefense(id: number, value: number): void {
        if (!isValidEntityId(id)) return;
        defaultWorld.stats[id * STRIDES.STATS + 4] = value;
    }

    static setDamageMultiplier(id: number, value: number): void {
        if (!isValidEntityId(id)) return;
        defaultWorld.stats[id * STRIDES.STATS + 5] = value;
    }

    static setCurrentHealth(id: number, value: number): void {
        StatsAccess.setCurrentHealth(defaultWorld, id, value);
    }

    static setMaxHealth(id: number, value: number): void {
        StatsAccess.setMaxHealth(defaultWorld, id, value);
    }

    static getCurrentHealth(id: number): number {
        return StatsAccess.getCurrentHealth(defaultWorld, id);
    }

    static getMaxHealth(id: number): number {
        return StatsAccess.getMaxHealth(defaultWorld, id);
    }

    static getScore(id: number): number {
        return StatsAccess.getScore(defaultWorld, id);
    }

    static getMatchPercent(id: number): number {
        return StatsAccess.getMatchPercent(defaultWorld, id);
    }

    static getDefense(id: number): number {
        if (!isValidEntityId(id)) return 1;
        return defaultWorld.stats[id * STRIDES.STATS + 4];
    }

    static getDamageMultiplier(id: number): number {
        if (!isValidEntityId(id)) return 1;
        return defaultWorld.stats[id * STRIDES.STATS + 5];
    }
}

// =============================================================================
// SKILL STORE (Static - Backward Compatible)
// =============================================================================

export class SkillStore {
    public static readonly STRIDE = STRIDES.SKILL;
    public static readonly data = defaultWorld.skills;

    static set(id: number, cooldown: number, maxCooldown: number, activeTimer: number, shapeId: number = 0): void {
        SkillAccess.set(defaultWorld, id, cooldown, maxCooldown, activeTimer, shapeId);
    }

    static getCooldown(id: number): number {
        return SkillAccess.getCooldown(defaultWorld, id);
    }

    static setCooldown(id: number, value: number): void {
        SkillAccess.setCooldown(defaultWorld, id, value);
    }

    static getMaxCooldown(id: number): number {
        return SkillAccess.getMaxCooldown(defaultWorld, id);
    }

    static setMaxCooldown(id: number, value: number): void {
        SkillAccess.setMaxCooldown(defaultWorld, id, value);
    }

    static getActiveTimer(id: number): number {
        return SkillAccess.getActiveTimer(defaultWorld, id);
    }

    static setActiveTimer(id: number, value: number): void {
        SkillAccess.setActiveTimer(defaultWorld, id, value);
    }
}

// =============================================================================
// TATTOO STORE (Static - Backward Compatible)
// =============================================================================

export class TattooStore {
    public static readonly STRIDE = STRIDES.TATTOO;
    public static readonly data = defaultWorld.tattoo;
    public static readonly flags = defaultWorld.tattooFlags;

    static set(id: number, flags: number, procChance: number): void {
        TattooAccess.set(defaultWorld, id, flags, procChance);
    }
}

// =============================================================================
// PROJECTILE STORE (Static - Backward Compatible)
// =============================================================================

export class ProjectileStore {
    public static readonly STRIDE = STRIDES.PROJECTILE;
    public static readonly data = defaultWorld.projectile;

    static set(id: number, ownerId: number, damage: number, duration: number, typeId: number = 0): void {
        ProjectileAccess.set(defaultWorld, id, ownerId, damage, duration, typeId);
    }
}

// =============================================================================
// CONFIG STORE (Static - Backward Compatible)
// =============================================================================

export class ConfigStore {
    public static readonly STRIDE = STRIDES.CONFIG;
    public static readonly data = defaultWorld.config;

    static set(
        id: number,
        magneticRadius: number,
        damageMult: number,
        speedMult: number,
        pickupRange: number,
        visionRange: number
    ): void {
        ConfigAccess.set(defaultWorld, id, magneticRadius, damageMult, speedMult, pickupRange, visionRange);
    }

    static getMagneticRadius(id: number): number {
        return ConfigAccess.getMagneticRadius(defaultWorld, id);
    }

    static getMagnetRadius(id: number): number {
        return ConfigAccess.getMagneticRadius(defaultWorld, id);
    }

    static getDamageMultiplier(id: number): number {
        return defaultWorld.config[id * STRIDES.CONFIG + 1];
    }

    static getSpeedMultiplier(id: number): number {
        return ConfigAccess.getSpeedMultiplier(defaultWorld, id);
    }

    static getMaxSpeed(id: number): number {
        return ConfigAccess.getMaxSpeed(defaultWorld, id);
    }

    static setMagneticRadius(id: number, value: number): void {
        ConfigAccess.setMagnetRadius(defaultWorld, id, value);
    }

    static setMagnetRadius(id: number, value: number): void {
        ConfigAccess.setMagnetRadius(defaultWorld, id, value);
    }

    static setDamageMultiplier(id: number, value: number): void {
        defaultWorld.config[id * STRIDES.CONFIG + 1] = value;
    }

    static setSpeedMultiplier(id: number, value: number): void {
        ConfigAccess.setSpeedMultiplier(defaultWorld, id, value);
    }

    static setMaxSpeed(id: number, value: number): void {
        ConfigAccess.setMaxSpeed(defaultWorld, id, value);
    }

    static setPickupRange(id: number, value: number): void {
        defaultWorld.config[id * STRIDES.CONFIG + 3] = value;
    }

    static setVisionRange(id: number, value: number): void {
        defaultWorld.config[id * STRIDES.CONFIG + 4] = value;
    }
}

// =============================================================================
// INPUT STORE (Static - Backward Compatible)
// =============================================================================

export class InputStore {
    public static readonly STRIDE = STRIDES.INPUT;
    public static readonly data = defaultWorld.input;

    static setTarget(id: number, x: number, y: number): void {
        InputAccess.setTarget(defaultWorld, id, x, y);
    }

    static getTarget(id: number, out: { x: number; y: number }): void {
        InputAccess.getTarget(defaultWorld, id, out);
    }

    static setAction(id: number, bit: number, active: boolean): void {
        InputAccess.setAction(defaultWorld, id, bit, active);
    }

    static isActionActive(id: number, actionBit: number): boolean {
        return InputAccess.isActionActive(defaultWorld, id, actionBit);
    }

    static consumeAction(id: number, actionBit: number): boolean {
        return InputAccess.consumeAction(defaultWorld, id, actionBit);
    }

    static getActions(id: number): number {
        return InputAccess.getActions(defaultWorld, id);
    }

    static setActions(id: number, actions: number): void {
        InputAccess.setActions(defaultWorld, id, actions);
    }
}

// =============================================================================
// PIGMENT STORE (Static - Backward Compatible)
// =============================================================================

export class PigmentStore {
    public static readonly STRIDE = STRIDES.PIGMENT;
    public static readonly data = defaultWorld.pigment;

    static readonly R = PigmentAccess.R;
    static readonly G = PigmentAccess.G;
    static readonly B = PigmentAccess.B;
    static readonly TARGET_R = PigmentAccess.TARGET_R;
    static readonly TARGET_G = PigmentAccess.TARGET_G;
    static readonly TARGET_B = PigmentAccess.TARGET_B;
    static readonly MATCH = PigmentAccess.MATCH;
    static readonly COLOR_INT = PigmentAccess.COLOR_INT;

    static init(id: number, r: number, g: number, b: number, targetR: number, targetG: number, targetB: number): void {
        PigmentAccess.init(defaultWorld, id, r, g, b, targetR, targetG, targetB);
    }

    static set(id: number, r: number, g: number, b: number): void {
        PigmentAccess.set(defaultWorld, id, r, g, b);
    }

    static mix(id: number, addR: number, addG: number, addB: number, ratio: number): void {
        PigmentAccess.mix(defaultWorld, id, addR, addG, addB, ratio);
    }

    static updateMatch(id: number): void {
        PigmentAccess.updateMatch(defaultWorld, id);
    }

    static updateColorInt(id: number): void {
        PigmentAccess.updateColorInt(defaultWorld, id);
    }

    static getPigment(id: number): { r: number; g: number; b: number } {
        return PigmentAccess.getPigment(defaultWorld, id);
    }

    static getMatch(id: number): number {
        return PigmentAccess.getMatch(defaultWorld, id);
    }

    static getColorInt(id: number): number {
        return PigmentAccess.getColorInt(defaultWorld, id);
    }
}

// =============================================================================
// ENTITY LOOKUP (Static - Backward Compatible)
// =============================================================================

export const EntityLookup: (unknown | null)[] = defaultWorld.entityLookup;

// =============================================================================
// RESET ALL STORES
// =============================================================================

export function resetAllStores(): void {
    defaultWorld.reset();
}
