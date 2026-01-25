
import { GameState, Player } from '../../types';
import { THRESHOLDS, RING_RADII } from './cjrConstants';

export const updateWinCondition = (state: GameState, dt: number, levelConfig: any) => {
    // Only check for players inside center zone
    const WIN_ZONE_RADIUS = 200;
    const HOLD_TIME = 1.5;

    let potentialWinner: Player | null = null;
    const playersToCheck = [...state.players, ...state.bots];

    // Find candidate
    for (const p of playersToCheck) {
        if (p.isDead) continue;

        // Check Physics
        const d = Math.hypot(p.position.x, p.position.y);
        if (d < WIN_ZONE_RADIUS) {
            if ('matchPercent' in p && p.matchPercent >= THRESHOLDS.WIN_HOLD) {
                potentialWinner = p as Player;
                break;
            }
        }
    }

    if (potentialWinner) {
        if (!potentialWinner.statusEffects.kingForm) potentialWinner.statusEffects.kingForm = 0;

        potentialWinner.statusEffects.kingForm += dt;
        const progress = potentialWinner.statusEffects.kingForm / HOLD_TIME;

        // EIDOLON-V: Dynamic Heartbeat (Juice)
        // Pulse faster as we get closer to 100%
        // Start: 0.5s interval -> End: 0.1s interval
        const currentInterval = 0.5 - (progress * 0.4);

        // Use a separate timer for pulse tracking if needed, or modulo logic with dynamic interval
        // Modulo with dynamic interval is tricky. Better to store lastPulseTime.
        // For now, let's use a simplified accumulation
        if (!potentialWinner.statusEffects.pulseTimer) potentialWinner.statusEffects.pulseTimer = 0;

        potentialWinner.statusEffects.pulseTimer += dt;

        if (potentialWinner.statusEffects.pulseTimer >= currentInterval) {
            // PULSE EVENT
            state.vfxEvents.push(`pulse_${potentialWinner.id}`);
            // Critical: Shake intensity scales with progress!
            state.shakeIntensity = 2 + (progress * 15);

            potentialWinner.statusEffects.pulseTimer = 0;
        }

        // Win Condition
        if (potentialWinner.statusEffects.kingForm >= HOLD_TIME) {
            state.result = 'win';
            state.kingId = potentialWinner.id;
        }

    } else {
        // Decay channel if not holding
        for (const p of playersToCheck) {
            if ((p.statusEffects.kingForm || 0) > 0) {
                // Decay faster than build up to punish leaving, but not instant
                p.statusEffects.kingForm = Math.max(0, (p.statusEffects.kingForm || 0) - dt * 2);
                p.statusEffects.pulseTimer = 0;
            }
        }
    }
};
