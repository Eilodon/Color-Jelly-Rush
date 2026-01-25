
import { GameState, Vector2 } from '../../types';
import { createFood } from '../engine/factories';
import { RING_RADII, COLOR_PALETTE } from './cjrConstants';
import { randomRange } from '../engine/math';

export const updateWaveSpawner = (state: GameState, dt: number) => {
    // Ring 1 Wave
    updateRingWave(state, dt, 'ring1', 1, RING_RADII.R2, RING_RADII.R1);

    // Ring 2 Wave
    updateRingWave(state, dt, 'ring2', 2, RING_RADII.R3, RING_RADII.R2);

    // Ring 3 Wave
    updateRingWave(state, dt, 'ring3', 3, 0, RING_RADII.R3);
};

const updateRingWave = (
    state: GameState,
    dt: number,
    key: 'ring1' | 'ring2' | 'ring3',
    ringId: number,
    innerR: number,
    outerR: number
) => {
    const wave = state.runtime.wave as any;
    if (!wave[key + 'Timer']) wave[key + 'Timer'] = state.levelConfig.waveIntervals[key] || 10;

    wave[key + 'Timer'] -= dt;

    if (wave[key + 'Timer'] <= 0) {
        // SPAWN WAVE
        spawnWaveInRing(state, ringId, innerR, outerR);

        // Reset Timer
        wave[key + 'Timer'] = state.levelConfig.waveIntervals[key] || 10;

        // Notify
        // state.vfxEvents.push(`wave_${ringId}`);
    }
};

const spawnWaveInRing = (state: GameState, ringId: number, innerR: number, outerR: number) => {
    // Count players in ring to scale wave?
    // For now, fixed burst size from config
    const burstSize = state.levelConfig.burstSizes[`ring${ringId}` as keyof typeof state.levelConfig.burstSizes] || 10;

    for (let i = 0; i < burstSize; i++) {
        // Stratified Sampling (Polar)
        const angleStep = (Math.PI * 2) / burstSize;
        const angle = i * angleStep + randomRange(-0.2, 0.2); // Jitter
        const r = randomRange(innerR + 20, outerR - 20); // Buffered

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        const f = createFood({ x, y });

        // Ring Specific Types
        if (ringId === 3) {
            // High value stuff
            if (Math.random() < 0.3) {
                f.kind = 'catalyst';
                f.color = '#ff00ff';
                f.value = 5;
            }
        } else if (ringId === 2) {
            if (Math.random() < 0.2) {
                f.kind = 'solvent';
                f.color = '#00ffff';
            }
        }

        state.food.push(f);
    }
};

export const resetWaveTimers = (runtime: any, config: any) => {
    runtime.wave = {
        ring1: config.waveIntervals.ring1,
        ring2: config.waveIntervals.ring2,
        ring3: config.waveIntervals.ring3,
        ring1Timer: 2, // Start first wave soon
        ring2Timer: 5,
        ring3Timer: 8
    };
};
