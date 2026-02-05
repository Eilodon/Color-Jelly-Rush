/**
 * @cjr/engine - WorldState
 * EIDOLON-V: Instance-based container for DOD stores.
 * 
 * Single Source of Truth for a specific Game Instance.
 * Allocates memory efficiently and manages component lifecycles.
 * 
 * BENEFITS:
 * - Multiple game instances in parallel (multi-room servers)
 * - Unit test isolation (no global state pollution)
 * - Ready for SharedArrayBuffer + WebWorker migration
 */

import { MAX_ENTITIES } from './EntityFlags';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface IWorldConfig {
    maxEntities?: number;
}

/** Stride definitions for TypedArray layouts */
export const STRIDES = {
    TRANSFORM: 8,   // [x, y, rotation, scale, prevX, prevY, prevRotation, _pad]
    PHYSICS: 8,     // [vx, vy, vRotation, mass, radius, restitution, friction, _pad]
    STATS: 8,       // [currentHealth, maxHealth, score, matchPercent, defense, damageMultiplier, _pad, _pad]
    SKILL: 4,       // [cooldown, maxCooldown, activeTimer, shapeId]
    TATTOO: 4,      // [timer1, timer2, procChance, _pad]
    PROJECTILE: 4,  // [ownerId, damage, duration, typeId]
    CONFIG: 8,      // [magneticRadius, damageMult, speedMult, pickupRange, visionRange, _pad, _pad, _pad]
    INPUT: 4,       // [targetX, targetY, actions, _pad]
    PIGMENT: 8,     // [r, g, b, targetR, targetG, targetB, match, colorInt]
} as const;

// =============================================================================
// WORLDSTATE CLASS
// =============================================================================

export class WorldState {
    public readonly maxEntities: number;

    // Core Data Stores (TypedArrays)
    public readonly transform: Float32Array;
    public readonly physics: Float32Array;
    public readonly stats: Float32Array;
    public readonly skills: Float32Array;
    public readonly tattoo: Float32Array;
    public readonly tattooFlags: Uint32Array;
    public readonly projectile: Float32Array;
    public readonly config: Float32Array;
    public readonly input: Float32Array;
    public readonly pigment: Float32Array;

    // Entity Management
    public readonly stateFlags: Uint16Array;
    public readonly entityLookup: (unknown | null)[];

    constructor(worldConfig?: IWorldConfig) {
        this.maxEntities = worldConfig?.maxEntities ?? MAX_ENTITIES;

        // Memory Allocation
        // Can upgrade to SharedArrayBuffer for WebWorker support
        this.transform = new Float32Array(this.maxEntities * STRIDES.TRANSFORM);
        this.physics = new Float32Array(this.maxEntities * STRIDES.PHYSICS);
        this.stats = new Float32Array(this.maxEntities * STRIDES.STATS);
        this.skills = new Float32Array(this.maxEntities * STRIDES.SKILL);
        this.tattoo = new Float32Array(this.maxEntities * STRIDES.TATTOO);
        this.tattooFlags = new Uint32Array(this.maxEntities);
        this.projectile = new Float32Array(this.maxEntities * STRIDES.PROJECTILE);
        this.config = new Float32Array(this.maxEntities * STRIDES.CONFIG);
        this.input = new Float32Array(this.maxEntities * STRIDES.INPUT);
        this.pigment = new Float32Array(this.maxEntities * STRIDES.PIGMENT);

        this.stateFlags = new Uint16Array(this.maxEntities);
        this.entityLookup = new Array(this.maxEntities).fill(null);
    }

    /**
     * Production-safe bounds check
     */
    isValidEntityId(id: number): boolean {
        return id >= 0 && id < this.maxEntities;
    }

    /**
     * Reset all memory to zero (faster than loop assignment)
     */
    reset(): void {
        this.transform.fill(0);
        this.physics.fill(0);
        this.stats.fill(0);
        this.skills.fill(0);
        this.tattoo.fill(0);
        this.tattooFlags.fill(0);
        this.projectile.fill(0);
        this.config.fill(0);
        this.input.fill(0);
        this.pigment.fill(0);
        this.stateFlags.fill(0);
        this.entityLookup.fill(null);
    }

    /**
     * Get memory footprint in bytes
     */
    getMemoryUsage(): number {
        return (
            this.transform.byteLength +
            this.physics.byteLength +
            this.stats.byteLength +
            this.skills.byteLength +
            this.tattoo.byteLength +
            this.tattooFlags.byteLength +
            this.projectile.byteLength +
            this.config.byteLength +
            this.input.byteLength +
            this.pigment.byteLength +
            this.stateFlags.byteLength
        );
    }
}

// =============================================================================
// DEFAULT WORLD (Backward Compatibility)
// =============================================================================

/**
 * Global default WorldState instance.
 * Used by static Store classes for backward compatibility.
 * 
 * @deprecated Prefer injecting WorldState instances for new code.
 */
export const defaultWorld = new WorldState();
