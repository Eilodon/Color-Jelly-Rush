/**
 * @cjr/engine - MovementSystem
 * Pure movement logic - game-agnostic, no hardcoded constants
 * 
 * EIDOLON-V FIX: Removed dependency on game-specific constants.
 * MAX_SPEED is now read from ConfigStore per-entity.
 */

import { PhysicsStore, TransformStore, InputStore, ConfigStore, StateStore } from '../dod/ComponentStores';
import { MAX_ENTITIES, EntityFlags } from '../dod/EntityFlags';

// Default values for when ConfigStore has no data
const DEFAULT_MAX_SPEED = 150;
const DEFAULT_ACCELERATION = 2000;

export class MovementSystem {
    /**
     * DOD Movement Logic (Pure Index-Based)
     * 
     * @param id Entity ID
     * @param dt Delta time
     * @param defaultMaxSpeed Optional default max speed (injected by game module)
     */
    static update(id: number, dt: number, defaultMaxSpeed: number = DEFAULT_MAX_SPEED) {
        // 1. Read inputs from InputStore
        const iIdx = id * InputStore.STRIDE;
        const tx = InputStore.data[iIdx];
        const ty = InputStore.data[iIdx + 1];

        // 2. Read speed config from ConfigStore (game-agnostic)
        // ConfigStore.data layout: [maxSpeed, speedMult, magnetRadius, ...]
        const speedMult = ConfigStore.getSpeedMultiplier(id) || 1;
        const configMaxSpeed = ConfigStore.getMaxSpeed(id);

        // Use configured max speed if set, otherwise use injected default
        const baseMaxSpeed = configMaxSpeed > 0 ? configMaxSpeed : defaultMaxSpeed;
        const effectiveMaxSpeed = baseMaxSpeed * speedMult;

        const tIdx = id * 8;
        const pIdx = id * 8;

        const px = TransformStore.data[tIdx];
        const py = TransformStore.data[tIdx + 1];

        // 3. Calculate direction
        const dx = tx - px;
        const dy = ty - py;
        const distSq = dx * dx + dy * dy;

        // Deadzone (squared)
        if (distSq < 1) {
            return;
        }

        const dist = Math.sqrt(distSq);

        // Simple seek behavior with acceleration
        const accel = DEFAULT_ACCELERATION;
        const ax = (dx / dist) * accel * dt;
        const ay = (dy / dist) * accel * dt;

        PhysicsStore.data[pIdx] += ax;
        PhysicsStore.data[pIdx + 1] += ay;

        // Cap speed
        const vx = PhysicsStore.data[pIdx];
        const vy = PhysicsStore.data[pIdx + 1];
        const vSq = vx * vx + vy * vy;
        const maxSq = effectiveMaxSpeed * effectiveMaxSpeed;

        if (vSq > maxSq) {
            const v = Math.sqrt(vSq);
            const scale = effectiveMaxSpeed / v;
            PhysicsStore.data[pIdx] *= scale;
            PhysicsStore.data[pIdx + 1] *= scale;
        }
    }

    /**
     * Update all active entities
     * 
     * @param dt Delta time
     * @param defaultMaxSpeed Optional default max speed for all entities
     */
    static updateAll(dt: number, defaultMaxSpeed: number = DEFAULT_MAX_SPEED) {
        const count = MAX_ENTITIES;
        const flags = StateStore.flags;

        for (let id = 0; id < count; id++) {
            if ((flags[id] & EntityFlags.ACTIVE) !== 0) {
                this.update(id, dt, defaultMaxSpeed);
            }
        }
    }

    /**
     * Apply input with explicit target/config (for external callers)
     * This is the fully decoupled version - no global dependencies
     */
    static applyInputDOD(
        id: number,
        target: { x: number; y: number },
        config: { maxSpeed: number; speedMultiplier: number; acceleration?: number },
        dt: number
    ) {
        const pIdx = id * 8;
        const tIdx = id * 8;
        const px = TransformStore.data[tIdx];
        const py = TransformStore.data[tIdx + 1];

        const dx = target.x - px;
        const dy = target.y - py;
        const distSq = dx * dx + dy * dy;

        if (distSq < 1) return;

        const dist = Math.sqrt(distSq);
        const accel = config.acceleration ?? DEFAULT_ACCELERATION;
        const ax = (dx / dist) * accel * dt;
        const ay = (dy / dist) * accel * dt;

        PhysicsStore.data[pIdx] += ax;
        PhysicsStore.data[pIdx + 1] += ay;

        const effectiveMaxSpeed = config.maxSpeed * config.speedMultiplier;
        const vx = PhysicsStore.data[pIdx];
        const vy = PhysicsStore.data[pIdx + 1];
        const vSq = vx * vx + vy * vy;
        const maxSq = effectiveMaxSpeed * effectiveMaxSpeed;

        if (vSq > maxSq) {
            const v = Math.sqrt(vSq);
            const scale = effectiveMaxSpeed / v;
            PhysicsStore.data[pIdx] *= scale;
            PhysicsStore.data[pIdx + 1] *= scale;
        }
    }
}
