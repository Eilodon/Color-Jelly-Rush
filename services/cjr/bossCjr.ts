
import { GameState, Bot, Player, Vector2 } from '../../types';
import { distance, normalize } from '../engine/math';
import { createProjectile } from '../engine/factories';
import { trackDamage, distributeBossRewards } from './contribution';
import { triggerEmotion } from './emotions';
import { createFloatingText } from '../engine/effects';

// Boss Config
const BOSS_CONFIG = {
    BOSS_1_HP: 2000,
    BOSS_2_HP: 5000,
    ATTACK_RANGE: 300,
    CHARGE_TIME: 1.5,
    SIGHT_RANGE: 500
};

export const updateBossLogic = (state: GameState, dt: number) => {
    // Check if boss exists
    let boss = state.bots.find(b => b.isBoss && !b.isDead);

    // If no boss and we are in a state that needs one?
    // For now, assume Boss is spawned by level config or event.
    // If Boss 1 is dead, maybe spawn Boss 2 later?
    // We'll focus on the Active Boss Logic here.

    if (!boss) return;

    // Boss Phase Logic
    if (!state.runtime.boss.currentBossActive) {
        state.runtime.boss.currentBossActive = true;
        createFloatingText(boss.position, "BOSS ACTIVE!", "#ff0000", 30, state);
        triggerEmotion(boss, 'greed');
    }

    // AI Logic Override for Boss
    const nearby = state.players.filter(p => !p.isDead && distance(p.position, boss!.position) < BOSS_CONFIG.SIGHT_RANGE);

    if (nearby.length === 0) {
        // IDLE / REGEN
        if (boss.currentHealth < boss.maxHealth) {
            boss.currentHealth += 10 * dt; // Slow regen
        }
        return;
    }

    // Find closest target
    let target: Player | null = null;
    let minDst = Infinity;
    for (const p of nearby) {
        const d = distance(p.position, boss.position);
        if (d < minDst) {
            minDst = d;
            target = p;
        }
    }

    if (!target) return;

    // Movement
    const dx = target.position.x - boss.position.x;
    const dy = target.position.y - boss.position.y;
    const dist = Math.hypot(dx, dy);

    // Boss Attack Pattern
    if (!state.runtime.boss.attackCharging) {
        // Move towards target
        if (dist > 100) {
            const moveSpeed = 80;
            boss.velocity.x += (dx / dist) * moveSpeed * dt;
            boss.velocity.y += (dy / dist) * moveSpeed * dt;
        }

        // Attack Trigger
        boss.bossAttackTimer = (boss.bossAttackTimer || 0) - dt;

        if (boss.bossAttackTimer <= 0 && dist < BOSS_CONFIG.ATTACK_RANGE) {
            // Start Charge
            state.runtime.boss.attackCharging = true;
            state.runtime.boss.attackChargeTimer = BOSS_CONFIG.CHARGE_TIME;
            state.runtime.boss.attackTarget = { x: target.position.x, y: target.position.y };

            triggerEmotion(boss, 'greed'); // "Anger" face?
            createFloatingText(boss.position, "!", "#ff0000", 40, state);

            // Telegraph Visual (simulated by emote for now, or vfx event)
            state.vfxEvents.push(`telegraph_${boss.id}`);
        }
    } else {
        // Charging
        boss.velocity.x *= 0.9;
        boss.velocity.y *= 0.9;

        state.runtime.boss.attackChargeTimer -= dt;
        if (state.runtime.boss.attackChargeTimer <= 0) {
            // EXECUTE ATTACK
            executeBossAttack(boss, state);

            // Reset
            state.runtime.boss.attackCharging = false;
            boss.bossAttackTimer = 4.0; // Cooldown
        }
    }
};

const executeBossAttack = (boss: Bot, state: GameState) => {
    // Simple 360 Burst or Dash
    // Let's do a Dash + Projectile Nova

    // Dash to target
    if (state.runtime.boss.attackTarget) {
        const tx = state.runtime.boss.attackTarget.x;
        const ty = state.runtime.boss.attackTarget.y;
        const dx = tx - boss.position.x;
        const dy = ty - boss.position.y;
        const d = Math.hypot(dx, dy);

        if (d > 1) {
            boss.velocity.x = (dx / d) * 800; // FAST DASH
            boss.velocity.y = (dy / d) * 800;
        }
    }

    // Nova
    const count = 8;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const targetPos = {
            x: boss.position.x + Math.cos(angle) * 100,
            y: boss.position.y + Math.sin(angle) * 100
        };
        const p = createProjectile(
            boss.id,
            boss.position,
            targetPos,
            25,
            'ice',
            2.0
        );
        p.color = '#ff0000'; // Override color
        state.projectiles.push(p);
    }

    state.shakeIntensity = 10;
    triggerEmotion(boss, 'happy'); // "Evil laugh"
};

export const resetBossState = (runtime: any) => {
    runtime.boss = {
        bossDefeated: false,
        rushWindowTimer: 0,
        rushWindowRing: null,
        currentBossActive: false,
        attackCharging: false,
        attackTarget: null,
        attackChargeTimer: 0
    };
};
