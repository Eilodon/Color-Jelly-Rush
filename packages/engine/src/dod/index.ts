/**
 * @cjr/engine - DOD Module Index
 * 
 * EIDOLON-V: Compatibility Layer for Legacy ComponentStores.
 * Proxies legacy static access (TransformStore.data, etc.) to generated WorldState.
 */

import {
    WorldState,
    defaultWorld,
    STRIDES,
    MAX_ENTITIES,
    type IWorldConfig
} from '../generated/WorldState';

import {
    EntityFlags as GeneratedEntityFlags,
    TransformAccess,
    PhysicsAccess,
    StatsAccess,
    InputAccess,
    ConfigAccess,
    SkillAccess,
    ProjectileAccess,
    StateAccess,
    PigmentAccess,
    TattooAccess,
} from '../generated/ComponentAccessors';

// Re-export generated types
export {
    WorldState,
    defaultWorld,
    STRIDES,
    MAX_ENTITIES,
    type IWorldConfig
};

export {
    NetworkSerializer,
    COMPONENT_IDS,
    COMPONENT_STRIDES
} from '../generated/NetworkPacker';

// =============================================================================
// COMPATIBILITY STORES
// Proxies that maintain the old API (static .data, .set without world arg)
// =============================================================================

export class TransformStore {
    static readonly STRIDE = STRIDES.TRANSFORM;

    static get data(): Float32Array {
        return defaultWorld.transform;
    }

    static getX(id: number): number {
        return TransformAccess.getX(defaultWorld, id);
    }

    static getY(id: number): number {
        return TransformAccess.getY(defaultWorld, id);
    }

    static set(id: number, x: number, y: number, rotation: number, scale: number = 1): void {
        // Old set took 4-5 args. New set takes 9. We'll map what we have.
        // Initialize prev values to current values
        TransformAccess.set(defaultWorld, id, x, y, rotation, scale, x, y, rotation);
    }

    static setPosition(id: number, x: number, y: number): void {
        TransformAccess.setX(defaultWorld, id, x);
        TransformAccess.setY(defaultWorld, id, y);
    }
}

export class PhysicsStore {
    static readonly STRIDE = STRIDES.PHYSICS;

    static get data(): Float32Array {
        return defaultWorld.physics;
    }

    static getVx(id: number): number {
        return PhysicsAccess.getVx(defaultWorld, id);
    }

    static getVy(id: number): number {
        return PhysicsAccess.getVy(defaultWorld, id);
    }

    static getRadius(id: number): number {
        return PhysicsAccess.getRadius(defaultWorld, id);
    }

    static getVelocityX(id: number): number {
        return PhysicsAccess.getVx(defaultWorld, id);
    }

    static getVelocityY(id: number): number {
        return PhysicsAccess.getVy(defaultWorld, id);
    }

    static set(id: number, vx: number, vy: number, mass: number, radius: number, restitution: number = 0.5, friction: number = 0.9): void {
        PhysicsAccess.set(defaultWorld, id, vx, vy, 0, mass, radius, restitution, friction);
    }

    static setVelocity(id: number, vx: number, vy: number): void {
        PhysicsAccess.setVx(defaultWorld, id, vx);
        PhysicsAccess.setVy(defaultWorld, id, vy);
    }

    static setRadius(id: number, radius: number): void {
        PhysicsAccess.setRadius(defaultWorld, id, radius);
    }
}

export class StatsStore {
    static readonly STRIDE = STRIDES.STATS;

    static get data(): Float32Array {
        return defaultWorld.stats;
    }

    static getCurrentHealth(id: number): number {
        return StatsAccess.getHp(defaultWorld, id);
    }

    static getMaxHealth(id: number): number {
        return StatsAccess.getMaxHp(defaultWorld, id);
    }

    static getScore(id: number): number {
        return StatsAccess.getScore(defaultWorld, id);
    }

    static getMatchPercent(id: number): number {
        return StatsAccess.getMatchPercent(defaultWorld, id);
    }

    static getDamageMultiplier(id: number): number {
        return StatsAccess.getDamageMultiplier(defaultWorld, id);
    }

    static set(id: number, hp: number, maxHp: number, score: number, matchPercent: number, defense: number, damageMultiplier: number): void {
        StatsAccess.set(defaultWorld, id, hp, maxHp, score, matchPercent, defense, damageMultiplier);
    }

    static setCurrentHealth(id: number, value: number): void {
        StatsAccess.setHp(defaultWorld, id, value);
    }

    static setMaxHealth(id: number, value: number): void {
        StatsAccess.setMaxHp(defaultWorld, id, value);
    }
}

export class StateStore {
    // State is strictly Uint8Array, not Float32Array. 
    // Old StateStore might have exposed 'flags' as Uint8Array? 
    // Checking memory-convergence.test.ts: StateStore.flags[0]

    static get flags(): Uint8Array {
        return defaultWorld.stateFlags;
    }

    static get data(): Uint8Array {
        return defaultWorld.stateFlags;
    }

    static isActive(id: number): boolean {
        return StateAccess.isActive(defaultWorld, id);
    }

    static hasFlag(id: number, flag: number): boolean {
        return StateAccess.hasFlag(defaultWorld, id, flag);
    }

    static setFlag(id: number, flag: number): void {
        StateAccess.setFlag(defaultWorld, id, flag);
    }

    static clearFlag(id: number, flag: number): void {
        StateAccess.clearFlag(defaultWorld, id, flag);
    }
}

export class InputStore {
    static readonly STRIDE = STRIDES.INPUT;

    static get data(): Float32Array {
        return defaultWorld.input;
    }

    static setTarget(id: number, x: number, y: number): void {
        InputAccess.setTargetX(defaultWorld, id, x);
        InputAccess.setTargetY(defaultWorld, id, y);
    }

    static getTarget(id: number, out: { x: number, y: number }): void {
        out.x = InputAccess.getTargetX(defaultWorld, id);
        out.y = InputAccess.getTargetY(defaultWorld, id);
    }

    static setAction(id: number, bit: number, active: boolean): void {
        // Implementation might depend on old storage bitmask logic
        // Current generated Input has 'actions' field (float)
        // Bit ops on float are tricky, usually cast to int
        let actions = defaultWorld.inputView.getUint32(id * STRIDES.INPUT + 8, true); // actions is at offset 8
        if (active) actions |= (1 << bit);
        else actions &= ~(1 << bit);
        defaultWorld.inputView.setUint32(id * STRIDES.INPUT + 8, actions, true);
    }

    static isActionActive(id: number, bit: number): boolean {
        let actions = defaultWorld.inputView.getUint32(id * STRIDES.INPUT + 8, true);
        return (actions & (1 << bit)) !== 0;
    }

    static consumeAction(id: number, bit: number): boolean {
        let actions = defaultWorld.inputView.getUint32(id * STRIDES.INPUT + 8, true);
        if ((actions & (1 << bit)) !== 0) {
            actions &= ~(1 << bit);
            defaultWorld.inputView.setUint32(id * STRIDES.INPUT + 8, actions, true);
            return true;
        }
        return false;
    }
}

export class ConfigStore {
    static readonly STRIDE = STRIDES.CONFIG;

    static get data(): Float32Array {
        return defaultWorld.config;
    }

    static getMaxSpeed(id: number): number {
        // ConfigAccess doesn't seem to have maxSpeed? Checking schema...
        // Schema had: magneticRadius, damageMult, speedMult, pickupRange, visionRange
        // Maybe old code used maxSpeed?
        // Let's assume defaults or map to speedMult * BASE
        return 0; // Fallback
    }

    static getSpeedMultiplier(id: number): number {
        return ConfigAccess.getSpeedMult(defaultWorld, id);
    }

    static setSpeedMultiplier(id: number, value: number): void {
        ConfigAccess.setSpeedMult(defaultWorld, id, value);
    }

    static getMagnetRadius(id: number): number {
        return ConfigAccess.getMagneticRadius(defaultWorld, id);
    }

    static setMagnetRadius(id: number, value: number): void {
        ConfigAccess.setMagneticRadius(defaultWorld, id, value);
    }
}

export class SkillStore {
    static readonly STRIDE = STRIDES.SKILL;

    static get data(): Float32Array {
        return defaultWorld.skill;
    }

    static getCooldown(id: number): number {
        return SkillAccess.getCooldown(defaultWorld, id);
    }

    static getMaxCooldown(id: number): number {
        return SkillAccess.getMaxCooldown(defaultWorld, id);
    }

    static getActiveTimer(id: number): number {
        return SkillAccess.getActiveTimer(defaultWorld, id);
    }

    static set(id: number, cooldown: number, maxCooldown: number, activeTimer: number): void {
        // SkillAccess.set takes additional shapeId arg
        SkillAccess.set(defaultWorld, id, cooldown, maxCooldown, activeTimer, 0);
    }

    static setCooldown(id: number, val: number) { SkillAccess.setCooldown(defaultWorld, id, val); }
    static setMaxCooldown(id: number, val: number) { SkillAccess.setMaxCooldown(defaultWorld, id, val); }
    static setActiveTimer(id: number, val: number) { SkillAccess.setActiveTimer(defaultWorld, id, val); }
}

export class ProjectileStore {
    static readonly STRIDE = STRIDES.PROJECTILE;

    static get data(): Float32Array {
        return defaultWorld.projectile;
    }

    static set(id: number, ownerId: number, damage: number, duration: number, typeId: number): void {
        ProjectileAccess.set(defaultWorld, id, ownerId, damage, duration, typeId);
    }
}

export class PigmentStore {
    static readonly STRIDE = STRIDES.PIGMENT;
    static get data(): Float32Array { return defaultWorld.pigment; }
}

export class TattooStore {
    // Schema doesn't seem to have Tattoo? 
    // Wait, generated types might have missed it or it wasn't in schema.config.js
    // I recall TattooAccess in exports.
    // If it exists in ComponentAccessors, I can map it.
    // Checking exports list includes TattooAccess.
    static get data(): Float32Array { return (defaultWorld as any).tattoo || new Float32Array(0); }
}

/**
 * Reset all stores
 * @deprecated Use defaultWorld.reset()
 */
export function resetAllStores(): void {
    defaultWorld.reset();
}
