/**
 * @cjr/engine - Engine Class
 * 
 * Main coordinator for the headless game engine.
 * Orchestrates systems update order.
 */

import { PhysicsSystem } from './systems/PhysicsSystem';
import { MovementSystem } from './systems/MovementSystem';
import { SkillSystem } from './systems/SkillSystem';
import { updateWaveSpawner } from './cjr';
import { eventBuffer } from './events/EventRingBuffer';
import { resetAllStores, StateStore } from './dod/ComponentStores';
import { EntityFlags } from './dod/EntityFlags';

export interface IEngineConfig {
    tickRate: number;
}

export class Engine {
    private tickRate: number;
    private dt: number;
    private time: number = 0;

    constructor(config: IEngineConfig = { tickRate: 60 }) {
        this.tickRate = config.tickRate;
        this.dt = 1 / config.tickRate;
    }

    /**
     * Reset engine state (clears all entities)
     */
    reset() {
        resetAllStores();
        eventBuffer.clear();
        this.time = 0;
    }

    /**
     * Run a single simulation step
     * @param dt Delta time in seconds (optional override)
     */
    update(dt?: number) {
        const stepDt = dt || this.dt;
        this.time += stepDt;

        // 1. Systems Update (DOD)
        PhysicsSystem.update(stepDt);
        MovementSystem.updateAll(stepDt); // Update all active entities
        SkillSystem.update(stepDt);

        // 2. Game Logic
        // Note: WaveSpawner, BossLogic etc are currently functional state-based
        // They are updated by the specific game mode wrapper (Client OptimizedEngine or Server Bridge)
        // Future: Integrate them here if they become standardized systems
    }

    /**
     * Get current simulation time
     */
    getTime(): number {
        return this.time;
    }
}
