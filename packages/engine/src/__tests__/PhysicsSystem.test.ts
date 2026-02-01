/**
 * @cjr/engine - Unit Tests: PhysicsSystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { TransformStore, PhysicsStore, StateStore, resetAllStores } from '../dod/ComponentStores';
import { EntityFlags } from '../dod/EntityFlags';

describe('PhysicsSystem', () => {
    beforeEach(() => {
        resetAllStores();
    });

    describe('update', () => {
        it('should integrate velocity into position', () => {
            const entityId = 0;

            // Setup entity
            TransformStore.set(entityId, 100, 100, 0);
            PhysicsStore.set(entityId, 50, 30, 1, 10, 0.9, 1);
            StateStore.setFlag(entityId, EntityFlags.ACTIVE | EntityFlags.PLAYER);

            // Run physics for 1 second
            PhysicsSystem.update(1.0);

            // Check position changed
            const tIdx = entityId * TransformStore.STRIDE;
            const newX = TransformStore.data[tIdx];
            const newY = TransformStore.data[tIdx + 1];

            // Position should have moved in direction of velocity
            expect(newX).toBeGreaterThan(100);
            expect(newY).toBeGreaterThan(100);
        });

        it('should apply friction to velocity', () => {
            const entityId = 0;
            const friction = 0.9;

            // Setup entity with velocity
            TransformStore.set(entityId, 0, 0, 0);
            PhysicsStore.set(entityId, 100, 100, 1, 10, 0.5, friction);
            StateStore.setFlag(entityId, EntityFlags.ACTIVE | EntityFlags.PLAYER);

            // Get initial velocity
            const pIdx = entityId * PhysicsStore.STRIDE;
            const initialVx = PhysicsStore.data[pIdx];

            // Run physics
            PhysicsSystem.update(1.0);

            // Velocity should be reduced by friction
            const newVx = PhysicsStore.data[pIdx];
            expect(newVx).toBeLessThan(initialVx);
        });

        it('should skip inactive entities', () => {
            const entityId = 0;

            // Setup entity but DON'T set ACTIVE flag
            TransformStore.set(entityId, 100, 100, 0);
            PhysicsStore.set(entityId, 50, 30, 1, 10, 0.9, 1);
            // StateStore.flags[entityId] = 0; // Not active

            // Run physics
            PhysicsSystem.update(1.0);

            // Position should NOT have changed
            const tIdx = entityId * TransformStore.STRIDE;
            expect(TransformStore.data[tIdx]).toBe(100);
            expect(TransformStore.data[tIdx + 1]).toBe(100);
        });

        it('should handle multiple entities', () => {
            // Setup 3 entities
            for (let i = 0; i < 3; i++) {
                TransformStore.set(i, i * 100, i * 100, 0);
                PhysicsStore.set(i, 10, 10, 1, 10, 0.9, 1);
                StateStore.setFlag(i, EntityFlags.ACTIVE | EntityFlags.PLAYER);
            }

            // Run physics
            PhysicsSystem.update(1.0);

            // All entities should have moved
            for (let i = 0; i < 3; i++) {
                const tIdx = i * TransformStore.STRIDE;
                expect(TransformStore.data[tIdx]).toBeGreaterThan(i * 100);
            }
        });
    });
});
