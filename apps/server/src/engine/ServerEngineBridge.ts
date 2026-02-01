/**
 * ServerEngineBridge
 * 
 * Headless engine bridge for server-side simulation.
 * Ignores VFX events - only runs authoritative game logic.
 */

import {
    eventBuffer,
    PhysicsSystem,
    MovementSystem,
    SkillSystem,
    updateWaveSpawner,
    updateBossLogic,
    updateWinConditionLogic,
    checkRingTransition,
    triggerTattooOnUpdate,
    type IWinEntity,
    type IWinState,
    type IBossEntity,
    type IPlayerEntity,
    type IBossState,
    type IWaveState,
    type IRingEntity,
    type ITattooEntity,
} from '@cjr/engine';

/**
 * Server-side game state interface
 */
interface IServerGameState {
    isPaused: boolean;
    gameTime: number;
    result?: 'win' | 'lose' | null;
    kingId?: string;
    shakeIntensity?: number;
    runtime: {
        wave: {
            ring1: number;
            ring2: number;
            ring3: number;
        };
        winCondition?: {
            timer: number;
        };
        boss: {
            bossDefeated: boolean;
            rushWindowTimer: number;
            rushWindowRing: number | null;
            currentBossActive: boolean;
            attackCharging: boolean;
            attackTarget: IPlayerEntity | null;
            attackChargeTimer: number;
        };
    };
    levelConfig: {
        winCondition?: 'default' | 'hold_center';
        winHoldSeconds?: number;
        timeLimit: number;
    };
}

export class ServerEngineBridge {
    private tickRate: number;
    private dt: number;
    private entities: Map<string, number> = new Map(); // sessionId -> dodIndex

    constructor(tickRate: number = 20) {
        this.tickRate = tickRate;
        this.dt = 1 / tickRate;
    }

    /**
     * Add a player to the simulation
     * Returns the DOD entity index
     */
    addPlayer(sessionId: string, name: string, shape: string): number {
        // This is a placeholder - actual implementation would use DOD stores
        // For now, just track the entity
        const dodIndex = this.entities.size;
        this.entities.set(sessionId, dodIndex);
        return dodIndex;
    }

    /**
     * Remove a player from the simulation
     */
    removePlayer(sessionId: string): void {
        this.entities.delete(sessionId);
    }

    /**
     * Run a single simulation tick
     * Called by Colyseus room at fixed intervals
     */
    tick(
        state: IServerGameState,
        players: (IPlayerEntity & IRingEntity & ITattooEntity)[],
        bots: (IPlayerEntity & IRingEntity & ITattooEntity)[],
        boss: IBossEntity | null
    ): void {
        if (state.isPaused) return;

        const dt = this.dt;

        // 1. Physics (DOD)
        PhysicsSystem.update(dt);

        // 2. Movement (DOD)
        for (const player of players) {
            if (player.physicsIndex !== undefined) {
                MovementSystem.update(player.physicsIndex, dt);
            }
        }
        for (const bot of bots) {
            if (bot.physicsIndex !== undefined) {
                MovementSystem.update(bot.physicsIndex, dt);
            }
        }

        // 3. Skills (DOD)
        SkillSystem.update(dt);

        // 4. Ring Logic
        const allEntities = [...players, ...bots];
        for (const entity of allEntities) {
            if (!entity.isDead) {
                const result = checkRingTransition(entity as IRingEntity);
                if (result.transitioned) {
                    // Server can log or track ring transitions for anti-cheat
                }
            }
        }

        // 5. Tattoo Updates
        for (const entity of allEntities) {
            if (!entity.isDead && 'tattoos' in entity) {
                triggerTattooOnUpdate(entity as ITattooEntity, dt);
            }
        }

        // 6. Wave Spawner
        const spawnResult = updateWaveSpawner(state.runtime.wave, dt);
        // Server should add spawned food to authoritative state
        // This is handled by the room logic that calls this bridge

        // 7. Boss Logic
        const playerEntities = players.filter(p => !p.isDead);
        updateBossLogic(boss, playerEntities, dt);

        // 8. Win Condition
        const winEntities: IWinEntity[] = allEntities.filter(e => !e.isDead);
        const winState: IWinState = {
            result: state.result,
            kingId: state.kingId,
            shakeIntensity: state.shakeIntensity,
            runtime: {
                winCondition: state.runtime.winCondition,
            },
        };

        const winResult = updateWinConditionLogic(
            winEntities,
            winState,
            dt,
            state.levelConfig
        );

        // Sync win result back to state
        if (winResult.winner) {
            state.result = winState.result;
            state.kingId = winState.kingId;
        }

        // 9. Game Time
        state.gameTime += dt;
        if (state.gameTime > state.levelConfig.timeLimit && !state.result) {
            state.result = 'lose';
            state.isPaused = true;
        }

        // 10. IMPORTANT: Clear event buffer (server ignores VFX events)
        eventBuffer.clear();
    }

    /**
     * Get spawn results from last wave spawner update
     * Room can use this to create authoritative food entities
     */
    getSpawnResults(waveState: IWaveState['runtime']['wave'], dt: number) {
        return updateWaveSpawner(waveState, dt);
    }

    /**
     * Get tick rate
     */
    getTickRate(): number {
        return this.tickRate;
    }

    /**
     * Get delta time
     */
    getDeltaTime(): number {
        return this.dt;
    }
}

// Export singleton for simple usage
export const serverEngineBridge = new ServerEngineBridge();
