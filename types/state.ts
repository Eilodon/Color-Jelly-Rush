import { Vector2 } from './shared';
import { Player, Bot, TattooChoice, MatchSummary } from './player';
import { Food, Particle, Projectile, FloatingText, DelayedAction } from './entity';
import { LevelConfig } from '../services/cjr/levels';

export interface WaveRuntimeState {
    ring1: number;
    ring2: number;
    ring3: number;
}

export interface BossRuntimeState {
    bossDefeated: boolean;
    rushWindowTimer: number;
    rushWindowRing: 2 | null;
    currentBossActive: boolean;
    attackCharging: boolean;
    attackTarget: Vector2 | null;
    attackChargeTimer: number;
}

export interface ContributionRuntimeState {
    damageLog: Map<string, number>;
    lastHitBy: Map<string, string>;
}

export interface GameRuntimeState {
    wave: WaveRuntimeState;
    boss: BossRuntimeState;
    contribution: ContributionRuntimeState;
    winCondition?: {
        timer: number;
    };
}

// Forward declaration for engine
export interface IGameEngine {
    spatialGrid: any;
    particlePool: any;
    physicsWorld: any;
}

export interface GameState {
    player: Player;
    players: Player[];
    bots: Bot[];
    creeps: Bot[];
    boss: Bot | null;
    food: Food[];
    // Removed PowerUps, Hazards, Landmarks lists
    particles: Particle[];
    projectiles: Projectile[];
    floatingTexts: FloatingText[];
    delayedActions: DelayedAction[];

    engine: IGameEngine;
    runtime: GameRuntimeState;

    worldSize: Vector2;
    zoneRadius: number; // Keep for compatibility, map to Ring
    gameTime: number;
    currentRound: number;
    camera: Vector2;
    shakeIntensity: number;
    kingId: string | null;
    level: number;
    levelConfig: LevelConfig;

    tattooChoices: TattooChoice[] | null;
    unlockedTattoos: string[];
    isPaused: boolean;
    result: 'win' | 'lose' | null;
    vfxEvents: string[];

    inputs: {
        space: boolean;
        w: boolean;
    };
    inputEvents: any[];
}
