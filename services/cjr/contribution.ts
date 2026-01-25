
import { GameState, Player, Bot } from '../../types';
import { createFloatingText } from '../engine/effects';

export const trackDamage = (attacker: Player | Bot, victim: Player | Bot, damage: number, state: GameState) => {
    // Only track damage against Bosses
    if (!('isBoss' in victim) || !(victim as Bot).isBoss) return;

    const log = state.runtime.contribution.damageLog;
    const current = log.get(attacker.id) || 0;
    log.set(attacker.id, current + damage);

    state.runtime.contribution.lastHitBy.set(victim.id, attacker.id);
};

export const distributeBossRewards = (boss: Bot, state: GameState) => {
    const log = state.runtime.contribution.damageLog;
    if (log.size === 0) return;

    // Sort contributors
    const sorted = [...log.entries()].sort((a, b) => b[1] - a[1]);

    // Top 1: Massive Buff
    if (sorted.length > 0) {
        applyReward(sorted[0][0], 'top1', state);
    }

    // Top 3
    for (let i = 1; i < Math.min(3, sorted.length); i++) {
        applyReward(sorted[i][0], 'top3', state);
    }

    // Participation
    for (let i = 3; i < sorted.length; i++) {
        applyReward(sorted[i][0], 'participant', state);
    }

    // Reset Log
    log.clear();
};

const applyReward = (id: string, tier: 'top1' | 'top3' | 'participant', state: GameState) => {
    const p = state.players.find(pl => pl.id === id);
    if (!p) return;

    if (tier === 'top1') {
        p.statusEffects.damageBoost = 1.5;
        p.statusEffects.overdriveTimer = 10;
        p.score += 500;
        createFloatingText(p.position, "MVP!", "#ffd700", 40, state);
    } else if (tier === 'top3') {
        p.score += 200;
        p.statusEffects.speedBoost = 1.2;
        p.statusEffects.tempSpeedTimer = 5;
        createFloatingText(p.position, "Top 3", "#c0c0c0", 30, state);
    } else {
        p.score += 50;
        createFloatingText(p.position, "Contributor", "#cd7f32", 20, state);
    }
};

export const resetContributionLog = (runtime: any) => {
    runtime.contribution = {
        damageLog: new Map(),
        lastHitBy: new Map()
    };
};
