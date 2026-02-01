/**
 * @cjr/engine - PhysicsSystem
 * Pure physics integration - no VFX dependencies
 */

import { MAX_ENTITIES, EntityFlags } from '../dod/EntityFlags';
import { TransformStore, PhysicsStore, StateStore } from '../dod/ComponentStores';

export const PHY_MAP_RADIUS = 2500;
export const FRICTION_BASE = 0.92;

export class PhysicsSystem {
    static update(dt: number) {
        const count = MAX_ENTITIES;
        const flags = StateStore.flags;
        const pData = PhysicsStore.data;

        // Time scaling for variable framerate
        const timeScale = dt * 60;

        // Fast path check for stable 60fps
        const useFastFriction = Math.abs(timeScale - 1.0) < 0.01;

        // Pre-calculate power for standard friction (lag spike protection)
        const defaultFrictionUnstable = Math.pow(FRICTION_BASE, timeScale);

        for (let id = 0; id < count; id++) {
            // Bitmask check: only process active entities
            if ((flags[id] & EntityFlags.ACTIVE) === 0) continue;

            const pIdx = id * 8; // PhysicsStore.STRIDE

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

            this.integrateEntity(id, dt, effectiveFriction);
        }
    }

    static integrateEntity(id: number, dt: number, friction: number) {
        const tData = TransformStore.data;
        const pData = PhysicsStore.data;
        const tIdx = id * 8;
        const pIdx = id * 8;

        // 1. Unpack velocity
        let vx = pData[pIdx];
        let vy = pData[pIdx + 1];

        // 2. Apply friction
        vx *= friction;
        vy *= friction;

        // 3. Snapshot for interpolation
        tData[tIdx + 4] = tData[tIdx]; // prevX
        tData[tIdx + 5] = tData[tIdx + 1]; // prevY

        // 4. Integrate position (Euler)
        const delta = dt * 10;
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
