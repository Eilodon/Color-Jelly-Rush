/**
 * @cjr/engine - ComponentStores
 * Data-Oriented Design stores using TypedArrays
 * Zero dependencies - headless compatible
 * 
 * NOTE: EntityLookup is NOT included - it's client-only.
 * Use setEntityResolver() to inject a resolver function.
 */

import { MAX_ENTITIES, EntityFlags } from './EntityFlags';
import { getComponentRegistry } from '../core/ComponentRegistry';
import type { IRegisteredStore } from '../core/ComponentRegistry';

// EIDOLON-V Phase 3: ComponentStores now acts as a facade over ComponentRegistry
// Lazy initialization ensures registry is populated before first access

// Runtime validation for entity limits
const MAX_TYPED_ARRAY_SIZE = 65536;
if (MAX_ENTITIES * 8 > MAX_TYPED_ARRAY_SIZE) {
    throw new Error(
        `Entity configuration exceeds TypedArray limits: ${MAX_ENTITIES} entities × 8 stride = ${MAX_ENTITIES * 8} > ${MAX_TYPED_ARRAY_SIZE}`
    );
}

/**
 * Helper to get cached store reference from ComponentRegistry.
 * This ensures memory convergence - all data lives in one place.
 */
function getCachedStore(cache: { store: IRegisteredStore | null }, id: string): IRegisteredStore {
    if (!cache.store) {
        const registry = getComponentRegistry();
        const store = registry.getStore(id);
        if (!store) {
            throw new Error(
                `[ComponentStores] Store '${id}' not found in registry. ` +
                `Did you forget to call registerCoreComponents() before accessing ComponentStores?`
            );
        }
        cache.store = store;
    }
    return cache.store;
}

/**
 * Reset all store caches. Call this when ComponentRegistry is reset.
 * This ensures ComponentStores fetches fresh stores from the new registry.
 */
export function resetStoreCaches(): void {
    TransformStore.resetCache();
    PhysicsStore.resetCache();
    StatsStore.resetCache();
    StateStore.resetCache();
    SkillStore.resetCache();
    ProjectileStore.resetCache();
    ConfigStore.resetCache();
    InputStore.resetCache();
}

export class TransformStore {
    public static readonly STRIDE = 8;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Transform').data as Float32Array;
    }

    static set(id: number, x: number, y: number, rotation: number, scale: number = 1.0) {
        const idx = id * 8;
        this.data[idx] = x;
        this.data[idx + 1] = y;
        this.data[idx + 2] = rotation;
        this.data[idx + 3] = scale;
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
    public static readonly STRIDE = 8;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Physics').data as Float32Array;
    }

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
        this.data[idx + 2] = 0;
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
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get flags(): Uint16Array {
        return getCachedStore(this._cache, 'State').data as Uint16Array;
    }

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
    public static readonly STRIDE = 8;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Stats').data as Float32Array;
    }

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
    public static readonly STRIDE = 4;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Skill').data as Float32Array;
    }

    static set(id: number, cooldown: number, maxCooldown: number, shapeId: number) {
        const idx = id * SkillStore.STRIDE;
        this.data[idx] = cooldown;
        this.data[idx + 1] = maxCooldown;
        this.data[idx + 2] = 0;
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

export class ProjectileStore {
    public static readonly STRIDE = 4;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Projectile').data as Float32Array;
    }

    static set(id: number, ownerId: number, damage: number, duration: number, typeId: number = 0) {
        const idx = id * ProjectileStore.STRIDE;
        this.data[idx] = ownerId;
        this.data[idx + 1] = damage;
        this.data[idx + 2] = duration;
        this.data[idx + 3] = typeId;
    }
}

export class ConfigStore {
    public static readonly STRIDE = 4;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Config').data as Float32Array;
    }

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
    public static readonly STRIDE = 4;
    private static _cache: { store: IRegisteredStore | null } = { store: null };

    static resetCache(): void {
        this._cache.store = null;
    }

    // Action bitmasks - CJR Module defines these bits:
    // Bit 1 = ACTION_EJECT (0x02)
    // Bit 2 = ACTION_SKILL (0x04)
    // Games can define their own bits in higher positions

    public static get data(): Float32Array {
        return getCachedStore(this._cache, 'Input').data as Float32Array;
    }

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

    /**
     * Set an action bit in the actions bitmask
     * @param id Entity ID
     * @param actionBit Bit position (0-31)
     * @param active Whether the action is active
     */
    static setAction(id: number, actionBit: number, active: boolean) {
        const idx = id * InputStore.STRIDE + 2; // actions field at offset 2
        const current = this.data[idx];
        if (active) {
            this.data[idx] = current | (1 << actionBit);
        } else {
            this.data[idx] = current & ~(1 << actionBit);
        }
    }

    /**
     * Check if an action bit is set
     * @param id Entity ID
     * @param actionBit Bit position (0-31)
     */
    static isActionActive(id: number, actionBit: number): boolean {
        const idx = id * InputStore.STRIDE + 2;
        return (this.data[idx] & (1 << actionBit)) !== 0;
    }

    /**
     * Consume an action (check and clear)
     * @param id Entity ID
     * @param actionBit Bit position (0-31)
     * @returns true if action was active and consumed
     */
    static consumeAction(id: number, actionBit: number): boolean {
        const idx = id * InputStore.STRIDE + 2;
        const mask = 1 << actionBit;
        if ((this.data[idx] & mask) !== 0) {
            this.data[idx] &= ~mask;
            return true;
        }
        return false;
    }

    /**
     * Get full actions bitmask
     * @param id Entity ID
     */
    static getActions(id: number): number {
        return this.data[id * InputStore.STRIDE + 2];
    }

    /**
     * Set full actions bitmask
     * @param id Entity ID
     * @param actions Full bitmask value
     */
    static setActions(id: number, actions: number) {
        this.data[id * InputStore.STRIDE + 2] = actions;
    }

    // Legacy compatibility methods (deprecated, for migration)
    /** @deprecated Use setAction(id, ACTION_SKILL_BIT, active) */
    static setSkillActive(id: number, active: boolean) {
        this.setAction(id, 2, active); // Bit 2 = Skill
    }

    /** @deprecated Use isActionActive(id, ACTION_SKILL_BIT) */
    static getSkillActive(id: number): boolean {
        return this.isActionActive(id, 2);
    }

    /** @deprecated Use consumeAction(id, ACTION_SKILL_BIT) */
    static consumeSkillInput(id: number): boolean {
        return this.consumeAction(id, 2);
    }

    /** @deprecated Use setAction(id, ACTION_EJECT_BIT, active) */
    static setEjectActive(id: number, active: boolean) {
        this.setAction(id, 1, active); // Bit 1 = Eject
    }

    /** @deprecated Use consumeAction(id, ACTION_EJECT_BIT) */
    static consumeEjectInput(id: number): boolean {
        return this.consumeAction(id, 1);
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
    // TattooStore removed - CJR-specific, managed by CJRModule
    ProjectileStore.data.fill(0);
    ConfigStore.data.fill(0);
    InputStore.data.fill(0);
    StateStore.flags.fill(0);
}
