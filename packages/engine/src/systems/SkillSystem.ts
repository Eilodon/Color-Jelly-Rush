/**
 * @cjr/engine - SkillSystem
 * Pure skill logic - VFX decoupled via eventBuffer
 */

import { SkillStore, TransformStore, PhysicsStore, StateStore } from '../dod/ComponentStores';
import { MAX_ENTITIES, EntityFlags } from '../dod/EntityFlags';
import { eventBuffer, EngineEventType } from '../events/EventRingBuffer';

/**
 * Shape ID Enum for compile-time optimization
 */
export const enum ShapeEnum {
    CIRCLE = 1,
    SQUARE = 2,
    TRIANGLE = 3,
    HEX = 4,
}

export class SkillSystem {
    /**
     * Handle skill input for an entity
     */
    static handleInput(
        id: number,
        input: { space: boolean; target: { x: number; y: number } }
    ) {
        // Validation via bitmask
        if ((StateStore.flags[id] & EntityFlags.ACTIVE) === 0) return;
        if (!input.space) return;

        const sIdx = id * SkillStore.STRIDE;

        // Check cooldown
        if (SkillStore.data[sIdx] > 0) return;

        // Execute skill
        const shapeId = SkillStore.data[sIdx + 3];
        this.executeSkillDOD(id, shapeId, input.target);

        // Reset cooldown (index 1 = maxCooldown)
        SkillStore.data[sIdx] = SkillStore.data[sIdx + 1];
    }

    /**
     * Update cooldowns for all entities
     */
    static update(dt: number) {
        const count = MAX_ENTITIES;
        const flags = StateStore.flags;
        const data = SkillStore.data;

        for (let id = 0; id < count; id++) {
            if ((flags[id] & EntityFlags.ACTIVE) === 0) continue;

            const idx = id * SkillStore.STRIDE;
            if (data[idx] > 0) {
                data[idx] -= dt;
            }
        }
    }

    /**
     * Execute skill based on shape type
     * Emits events instead of direct VFX calls
     */
    private static executeSkillDOD(
        id: number,
        shapeId: number,
        target: { x: number; y: number }
    ) {
        const tIdx = id * 8;
        const pIdx = id * 8;
        const tData = TransformStore.data;
        const pData = PhysicsStore.data;

        const x = tData[tIdx];
        const y = tData[tIdx + 1];
        const vx = pData[pIdx];
        const vy = pData[pIdx + 1];

        // Circle (Jet Dash)
        if (shapeId === ShapeEnum.CIRCLE) {
            // Normalized velocity
            const speedSq = vx * vx + vy * vy;
            let dx = 1, dy = 0;

            if (speedSq > 0.001) {
                const invMag = 1.0 / Math.sqrt(speedSq);
                dx = vx * invMag;
                dy = vy * invMag;
            }

            const dashPower = 800;
            pData[pIdx] = dx * dashPower;
            pData[pIdx + 1] = dy * dashPower;

            // Emit VFX event (Cyan particle burst)
            eventBuffer.push(
                EngineEventType.PARTICLE_BURST,
                id,
                x,
                y,
                0x00ffff // Color: Cyan
            );
        }

        // Square (Shockwave)
        else if (shapeId === ShapeEnum.SQUARE) {
            // Emit shockwave event
            eventBuffer.push(
                EngineEventType.SHOCKWAVE,
                id,
                x,
                y,
                150 // Radius
            );
        }

        // Triangle (Pierce)
        else if (shapeId === ShapeEnum.TRIANGLE) {
            // Direction to target
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const piercePower = 600;
                pData[pIdx] = (dx / dist) * piercePower;
                pData[pIdx + 1] = (dy / dist) * piercePower;
            }

            eventBuffer.push(
                EngineEventType.PARTICLE_BURST,
                id,
                x,
                y,
                0xff6600 // Color: Orange
            );
        }

        // Hex (Vortex)
        else if (shapeId === ShapeEnum.HEX) {
            eventBuffer.push(
                EngineEventType.SHOCKWAVE,
                id,
                x,
                y,
                200 // Larger radius for vortex
            );
        }
    }
}
