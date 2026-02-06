/**
 * @cjr/client - WorkerSimulation
 * 
 * Headless simulation running in a Web Worker.
 * Responsible for:
 * 1. Physics integration (PhysicsSystem)
 * 2. Movement logic (MovementSystem)
 * 
 * EIDOLON-V: Zero-Copy architecture using SharedArrayBuffer.
 */

import { BaseSimulation, MovementSystem } from '@cjr/engine';

export class WorkerSimulation extends BaseSimulation {
    protected onInitialize(): void {
        console.log('[PhysicsWorker] Simulation initialized');
    }

    protected onShutdown(): void {
        console.log('[PhysicsWorker] Simulation shutdown');
    }

    /**
     * WORKER DO NOT RENDER
     */
    protected onInterpolate(_alpha: number): void {
        // No-op
    }

    /**
     * WORKER DO NOT HANDLE VISUALS
     */
    protected onEntityDeath(_entityId: number): void {
        // No-op
    }

    /**
     * Update entities - Execute Movement System
     */
    protected updateEntities(dt: number): void {
        // Apply inputs/AI results to velocity
        MovementSystem.updateAll(this.world, dt);
    }

    /**
     * Collision update
     */
    protected updateCollisions(_dt: number): void {
        // Map boundaries handled by PhysicsSystem
        // Future: Add spatial hash grid collision here if needed
    }
}
