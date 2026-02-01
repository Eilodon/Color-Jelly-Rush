/**
 * @cjr/engine - ComponentStores
 * Data-Oriented Design stores using TypedArrays
 * Zero dependencies - headless compatible
 * 
 * NOTE: EntityLookup is NOT included - it's client-only.
 * Use setEntityResolver() to inject a resolver function.
 */

import { MAX_ENTITIES, EntityFlags } from './EntityFlags';

// Runtime validation for entity limits
const MAX_TYPED_ARRAY_SIZE = 65536;
if (MAX_ENTITIES * 8 > MAX_TYPED_ARRAY_SIZE) {
    throw new Error(
        `Entity configuration exceeds TypedArray limits: ${MAX_ENTITIES} entities × 8 stride = ${MAX_ENTITIES * 8} > ${MAX_TYPED_ARRAY_SIZE}`
    );
}

export class TransformStore {
    // [x, y, rotation, scale, prevX, prevY, prevRotation, _pad]
    public static readonly STRIDE = 8;
    public static readonly data = new Float32Array(MAX_ENTITIES * TransformStore.STRIDE);

    static set(id: number, x: number, y: number, rotation: number, scale: number = 1.0) {
        const idx = id * 8;
        this.data[idx] = x;
        this.data[idx + 1] = y;
        this.data[idx + 2] = rotation;
        this.data[idx + 3] = scale;
        // Initialize prev
        this.data[idx + 4] = x;
        this.data[idx + 5] = y;
        this.data[idx + 6] = rotation;
    }

    static getX(id: number): number {
        return this.data[id * 8];
    }

    static getY(id: number): number {
        return this.data[id * 8 + 1];
    }

    static setPosition(id: number, x: number, y: number) {
        const idx = id * 8;
        this.data[idx] = x;
        this.data[idx + 1] = y;
    }
}

export class PhysicsStore {
    // [vx, vy, vRotation, mass, radius, restitution, friction, _pad]
    public static readonly STRIDE = 8;
    public static readonly data = new Float32Array(MAX_ENTITIES * PhysicsStore.STRIDE);

    static set(
        id: number,
        vx: number,
        vy: number,
        mass: number,
        radius: number,
        restitution: number = 0.5,
        friction: number = 0.9
    ) {
        const idx = id * 8;
        this.data[idx] = vx;
        this.data[idx + 1] = vy;
        this.data[idx + 2] = 0; // vRotation
        this.data[idx + 3] = mass;
        this.data[idx + 4] = radius;
        this.data[idx + 5] = restitution;
        this.data[idx + 6] = friction;
    }

    static getVelocityX(id: number): number {
        return this.data[id * 8];
    }

    static getVelocityY(id: number): number {
        return this.data[id * 8 + 1];
    }

    static setVelocity(id: number, vx: number, vy: number) {
        const idx = id * 8;
        this.data[idx] = vx;
        this.data[idx + 1] = vy;
    }

    static getRadius(id: number): number {
        return this.data[id * 8 + 4];
    }
}

export class StateStore {
    public static readonly flags = new Uint16Array(MAX_ENTITIES);

    static setFlag(id: number, flag: EntityFlags) {
        this.flags[id] |= flag;
    }

    static clearFlag(id: number, flag: EntityFlags) {
        this.flags[id] &= ~flag;
    }

    static hasFlag(id: number, flag: EntityFlags): boolean {
        return (this.flags[id] & flag) === flag;
    }

    static isActive(id: number): boolean {
        return (this.flags[id] & EntityFlags.ACTIVE) !== 0;
    }
}

export class StatsStore {
    // [currentHealth, maxHealth, score, matchPercent, defense, damageMultiplier, _pad, _pad]
    public static readonly STRIDE = 8;
    public static readonly data = new Float32Array(MAX_ENTITIES * StatsStore.STRIDE);

    static set(
        id: number,
        currentHealth: number,
        maxHealth: number,
        score: number,
        matchPercent: number,
        defense: number = 1,
        damageMultiplier: number = 1
    ) {
        const idx = id * StatsStore.STRIDE;
        this.data[idx] = currentHealth;
        this.data[idx + 1] = maxHealth;
        this.data[idx + 2] = score;
        this.data[idx + 3] = matchPercent;
        this.data[idx + 4] = defense;
        this.data[idx + 5] = damageMultiplier;
    }

    static setDefense(id: number, value: number) {
        this.data[id * StatsStore.STRIDE + 4] = value;
    }

    static setDamageMultiplier(id: number, value: number) {
        this.data[id * StatsStore.STRIDE + 5] = value;
    }

    static setCurrentHealth(id: number, value: number) {
        this.data[id * StatsStore.STRIDE] = value;
    }

    static setMaxHealth(id: number, value: number) {
        this.data[id * StatsStore.STRIDE + 1] = value;
    }

    static getCurrentHealth(id: number): number {
        return this.data[id * StatsStore.STRIDE];
    }

    static getMaxHealth(id: number): number {
        return this.data[id * StatsStore.STRIDE + 1];
    }

    static getScore(id: number): number {
        return this.data[id * StatsStore.STRIDE + 2];
    }

    static getMatchPercent(id: number): number {
        return this.data[id * StatsStore.STRIDE + 3];
    }

    static getDefense(id: number): number {
        return this.data[id * StatsStore.STRIDE + 4];
    }

    static getDamageMultiplier(id: number): number {
        return this.data[id * StatsStore.STRIDE + 5];
    }
}

export class SkillStore {
    // [cooldown, maxCooldown, activeTimer, shapeId]
    public static readonly STRIDE = 4;
    public static readonly data = new Float32Array(MAX_ENTITIES * SkillStore.STRIDE);

    static set(id: number, cooldown: number, maxCooldown: number, shapeId: number) {
        const idx = id * SkillStore.STRIDE;
        this.data[idx] = cooldown;
        this.data[idx + 1] = maxCooldown;
        this.data[idx + 2] = 0; // activeTimer
        this.data[idx + 3] = shapeId;
    }

    static getCooldown(id: number): number {
        return this.data[id * SkillStore.STRIDE];
    }

    static setCooldown(id: number, value: number) {
        this.data[id * SkillStore.STRIDE] = value;
    }

    static getShapeId(id: number): number {
        return this.data[id * SkillStore.STRIDE + 3];
    }
}

export class TattooStore {
    public static readonly STRIDE = 4;
    public static readonly data = new Float32Array(MAX_ENTITIES * TattooStore.STRIDE);
    public static readonly flags = new Uint32Array(MAX_ENTITIES);

    static set(id: number, flags: number, procChance: number) {
        this.flags[id] = flags;
        const idx = id * TattooStore.STRIDE;
        this.data[idx] = 0; // timer1
        this.data[idx + 1] = 0; // timer2
        this.data[idx + 2] = procChance;
    }
}

export class ProjectileStore {
    // [ownerId (int), damage, duration, typeId]
    public static readonly STRIDE = 4;
    public static readonly data = new Float32Array(MAX_ENTITIES * ProjectileStore.STRIDE);

    static set(id: number, ownerId: number, damage: number, duration: number, typeId: number = 0) {
        const idx = id * ProjectileStore.STRIDE;
        this.data[idx] = ownerId;
        this.data[idx + 1] = damage;
        this.data[idx + 2] = duration;
        this.data[idx + 3] = typeId;
    }
}

export class ConfigStore {
    // [maxSpeed, speedMultiplier, magnetRadius, _pad]
    public static readonly STRIDE = 4;
    public static readonly data = new Float32Array(MAX_ENTITIES * ConfigStore.STRIDE);

    static setMaxSpeed(id: number, value: number) {
        this.data[id * ConfigStore.STRIDE] = value;
    }

    static getMaxSpeed(id: number): number {
        return this.data[id * ConfigStore.STRIDE];
    }

    static setSpeedMultiplier(id: number, value: number) {
        this.data[id * ConfigStore.STRIDE + 1] = value;
    }

    static getSpeedMultiplier(id: number): number {
        return this.data[id * ConfigStore.STRIDE + 1] || 1;
    }

    static setMagnetRadius(id: number, value: number) {
        this.data[id * ConfigStore.STRIDE + 2] = value;
    }

    static getMagnetRadius(id: number): number {
        return this.data[id * ConfigStore.STRIDE + 2];
    }
}

export class InputStore {
    // [targetX, targetY, isSkillActive, isEjectActive]
    public static readonly STRIDE = 4;
    public static readonly data = new Float32Array(MAX_ENTITIES * InputStore.STRIDE);

    static setTarget(id: number, x: number, y: number) {
        const idx = id * InputStore.STRIDE;
        this.data[idx] = x;
        this.data[idx + 1] = y;
    }

    static getTarget(id: number, out: { x: number; y: number }) {
        const idx = id * InputStore.STRIDE;
        out.x = this.data[idx];
        out.y = this.data[idx + 1];
    }

    static setSkillActive(id: number, active: boolean) {
        this.data[id * InputStore.STRIDE + 2] = active ? 1 : 0;
    }

    static getSkillActive(id: number): boolean {
        return this.data[id * InputStore.STRIDE + 2] === 1;
    }

    static consumeSkillInput(id: number): boolean {
        const idx = id * InputStore.STRIDE;
        if (this.data[idx + 2] === 1) {
            this.data[idx + 2] = 0;
            return true;
        }
        return false;
    }

    static setEjectActive(id: number, active: boolean) {
        this.data[id * InputStore.STRIDE + 3] = active ? 1 : 0;
    }

    static consumeEjectInput(id: number): boolean {
        const idx = id * InputStore.STRIDE;
        if (this.data[idx + 3] === 1) {
            this.data[idx + 3] = 0;
            return true;
        }
        return false;
    }
}

/**
 * Reset all DOD stores to zero state
 */
export function resetAllStores() {
    TransformStore.data.fill(0);
    PhysicsStore.data.fill(0);
    StatsStore.data.fill(0);
    SkillStore.data.fill(0);
    TattooStore.data.fill(0);
    TattooStore.flags.fill(0);
    ProjectileStore.data.fill(0);
    ConfigStore.data.fill(0);
    InputStore.data.fill(0);
    StateStore.flags.fill(0);
}
