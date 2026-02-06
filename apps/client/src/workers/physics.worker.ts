/**
 * @cjr/client - Physics Worker
 * 
 * Entry point for the Physics Web Worker.
 * Handles:
 * - Initialization (SharedArrayBuffer injection)
 * - Game Loop (Fixed Timestep)
 * - Input Processing (Shared InputStore)
 */

import { WorldState, IWorldBuffers } from '@cjr/engine';
import { WorkerSimulation } from '../game/engine/WorkerSimulation';

// Self reference
const ctx: Worker = self as any;

let simulation: WorkerSimulation | null = null;
let intervalId: any = null;

// Message Types
type WorkerMessage =
    | { type: 'INIT'; config: { maxEntities: number; tickRate: number }; buffers: IWorldBuffers }
    | { type: 'START' }
    | { type: 'STOP' };

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    switch (msg.type) {
        case 'INIT':
            initSimulation(msg.config, msg.buffers);
            break;
        case 'START':
            startLoop();
            break;
        case 'STOP':
            stopLoop();
            break;
    }
};

function initSimulation(config: { maxEntities: number; tickRate: number }, buffers: IWorldBuffers) {
    if (simulation) return;

    console.log('[PhysicsWorker] Initializing with Shared Memory...');

    // 1. Reconstruct WorldState from SharedArrayBuffers
    const world = new WorldState({
        maxEntities: config.maxEntities,
        buffers: buffers
    });

    // 2. Create Simulation
    simulation = new WorkerSimulation({
        tickRate: config.tickRate,
        maxEntities: config.maxEntities,
        world: world, // Dependency Injection
    });

    simulation.initialize();

    // Reply
    ctx.postMessage({ type: 'INIT_COMPLETE' });
}

function startLoop() {
    if (!simulation || intervalId) return;

    console.log('[PhysicsWorker] Starting Game Loop');

    const tickRate = 60; // Should match config
    const frameTime = 1000 / tickRate;

    let lastTime = performance.now();

    // Use setInterval for simplicity in v1 (Audio/Render independent)
    intervalId = setInterval(() => {
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        // Run Fixed Update
        // Note: BaseSimulation handles accumulator, so we can pass variable dt
        // and it will run fixed ticks internally.
        simulation!.update(dt);

        // Sync back (Optional: Post debug stats)
        // ctx.postMessage({ type: 'STATS', frame: simulation!.getFrameCount() });

    }, frameTime);
}

function stopLoop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[PhysicsWorker] Stopped Loop');
    }
}
