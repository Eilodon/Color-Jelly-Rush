/**
 * @cjr/engine - PhysicsSystem
 * Pure physics integration - no VFX dependencies
 * 
 * EIDOLON-V REFACTOR: Now uses generated WorldState from schema.
 * Uses Float32Array for fast direct access.
 */

import { WorldState, defaultWorld, STRIDES } from '../generated/WorldState';
import { EntityFlags } from '../generated/ComponentAccessors';

// EIDOLON-V P2 FIX: Document the intentional difference between physics and visual boundaries
// PHY_MAP_RADIUS = 2500: Physics hard boundary - entities cannot move beyond this
// MAP_RADIUS = 1600 (in constants.ts): Visual game boundary / spawn zone
// The physics boundary is larger to allow visual effects and smooth clamping at edges
// This is NOT a bug - it's intentional margin for better gameplay feel
export const PHY_MAP_RADIUS = 2500;
export const FRICTION_BASE = 0.92;

export class PhysicsSystem {
    /**
     * Update physics for all active entities
     * @param worldOrDt - WorldState instance OR dt for backward compatibility
     * @param dt - Delta time (only used when worldOrDt is WorldState)
     */
    static update(worldOrDt: WorldState | number, dt?: number): void {
        // Backward compatibility: if first arg is number, use defaultWorld
        let world: WorldState;
        let deltaTime: number;

        if (typeof worldOrDt === 'number') {
            world = defaultWorld;
            deltaTime = worldOrDt;
        } else {
            world = worldOrDt;
            deltaTime = dt!;
        }

        const count = world.maxEntities;
        const flags = world.stateFlags;
        const pData = world.physics;

        // Time scaling for variable framerate
        const timeScale = deltaTime * 60;

        // Fast path check for stable 60fps
        const useFastFriction = Math.abs(timeScale - 1.0) < 0.01;

        // Pre-calculate power for standard friction (lag spike protection)
        const defaultFrictionUnstable = Math.pow(FRICTION_BASE, timeScale);

        for (let id = 0; id < count; id++) {
            // Bitmask check: only process active entities
            if ((flags[id] & EntityFlags.ACTIVE) === 0) continue;

            const pIdx = id * STRIDES.PHYSICS;

            // Get base friction from store (index 6)
            const frictionBase = pData[pIdx + 6];

            let effectiveFriction: number;

            if (useFastFriction) {
                effectiveFriction = frictionBase;
            } else {
                // Optimization: most entities use FRICTION_BASE
                if (Math.abs(frictionBase - FRICTION_BASE) < 0.0001) {
                    effectiveFriction = defaultFrictionUnstable;
                } else {
                    effectiveFriction = Math.pow(frictionBase, timeScale);
                }
            }

            this.integrateEntity(world, id, deltaTime, effectiveFriction);
        }
    }

    /**
     * Integrate single entity's physics
     * @param worldOrId - WorldState instance OR entity ID for backward compatibility
     * @param idOrDt - Entity ID (when world is passed) OR dt (backward compat)
     * @param dtOrFriction - dt (when world is passed) OR friction (backward compat)
     * @param friction - friction (only when world is passed)
     */
    static integrateEntity(
        worldOrId: WorldState | number,
        idOrDt: number,
        dtOrFriction: number,
        friction?: number
    ): void {
        // Backward compatibility
        let world: WorldState;
        let id: number;
        let dt: number;
        let fric: number;

        if (typeof worldOrId === 'number') {
            world = defaultWorld;
            id = worldOrId;
            dt = idOrDt;
            fric = dtOrFriction;
        } else {
            world = worldOrId;
            id = idOrDt;
            dt = dtOrFriction;
            fric = friction!;
        }

        const tData = world.transform;
        const pData = world.physics;
        const tIdx = id * STRIDES.TRANSFORM;
        const pIdx = id * STRIDES.PHYSICS;

        // 1. Unpack velocity
        let vx = pData[pIdx];
        let vy = pData[pIdx + 1];

        // 2. Apply friction
        vx *= fric;
        vy *= fric;

        // 3. Snapshot for interpolation
        tData[tIdx + 4] = tData[tIdx]; // prevX
        tData[tIdx + 5] = tData[tIdx + 1]; // prevY

        // 4. Integrate position (Euler)
        // PHYSICS_TIME_SCALE = 10: Converts velocity from "units per 100ms" to "units per frame"
        const PHYSICS_TIME_SCALE = 10;
        const delta = dt * PHYSICS_TIME_SCALE;
        tData[tIdx] += vx * delta;
        tData[tIdx + 1] += vy * delta;

        // 5. Write back velocity
        pData[pIdx] = vx;
        pData[pIdx + 1] = vy;

        // 6. Map constraints (circular arena)
        const r = pData[pIdx + 4]; // radius
        const limit = PHY_MAP_RADIUS - r;
        const limitSq = limit * limit;

        const x = tData[tIdx];
        const y = tData[tIdx + 1];
        const distSq = x * x + y * y;

        if (distSq > limitSq) {
            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist;
            const nx = x * invDist;
            const ny = y * invDist;

            // Clamp position
            tData[tIdx] = nx * limit;
            tData[tIdx + 1] = ny * limit;

            // Bounce (reflect velocity)
            const dot = vx * nx + vy * ny;
            if (dot > 0) {
                const bounceFactor = 1.5;
                pData[pIdx] -= bounceFactor * dot * nx;
                pData[pIdx + 1] -= bounceFactor * dot * ny;
            }
        }
    }
}
