import { Component } from '../Component';
import { SynergyComponent, TattooSynergyEffect } from '../components/SynergyComponent';
import { Player, Bot, GameState, isPlayerOrBot } from '../../../types';
import { TATTOO_SYNERGIES, TattooSynergy } from '../../cjr/synergyDefinitions';
import { createFloatingText } from '../../engine/effects';

export class SynergySystem {

    update(state: GameState, dt: number) {
        // Process all players and bots who might have synergies
        // EIDOLON-V: ECS FACADE WARNING
// This is NOT true ECS - it's OOP masquerading as ECS
// True ECS would query entities by components, not iterate arrays manually
// TODO: Either implement proper ECS with component queries or remove ECS facade
const entities = [...state.players, ...state.bots];

        entities.forEach(entity => {
            // Ensure component exists (Lazy init for migration if not in factory yet)
            let synergyComp = entity.components?.get('SynergyComponent') as SynergyComponent;
            if (!synergyComp && entity.components) {
                // If components map exists but no synergy (should be in factory)
                // For MVP refactor we can inject it here if missing?
                // Better: Assumed factories are updated. 
                // If not, we skip processing.
                return;
            }
            if (!synergyComp) return;

            this.checkSynergies(entity, synergyComp, state);
            this.updateSynergies(entity, synergyComp, state, dt);
        });
    }

    private checkSynergies(player: Player | Bot, comp: SynergyComponent, state: GameState) {
        const playerTattoos = player.tattoos || [];

        for (const synergy of TATTOO_SYNERGIES) {
            if (this.isSynergyOnCooldown(comp, synergy.id)) continue;

            if (this.hasRequiredTattoos(playerTattoos, synergy.tattoos)) {
                if (this.meetsUnlockRequirements(player, synergy)) {
                    this.activateSynergy(player, comp, synergy, state);
                }
            }
        }
    }

    private updateSynergies(player: Player | Bot, comp: SynergyComponent, state: GameState, dt: number) {
        // Cooldowns
        for (const [id, cd] of comp.cooldowns.entries()) {
            const newCd = Math.max(0, cd - dt);
            if (newCd === 0) comp.cooldowns.delete(id);
            else comp.cooldowns.set(id, newCd);
        }

        // Active Effects
        for (let i = comp.activeEffects.length - 1; i >= 0; i--) {
            const effect = comp.activeEffects[i];
            effect.elapsed += dt;
            if (effect.elapsed >= effect.duration) {
                comp.activeEffects.splice(i, 1);
                this.removeSynergyEffects(player, effect.synergyId, state);
            }
        }
    }

    private activateSynergy(player: Player | Bot, comp: SynergyComponent, synergy: TattooSynergy, state: GameState) {
        // Apply Effect
        synergy.effect(player, state);

        // Track Effect
        const effect: TattooSynergyEffect = {
            id: `${player.id}_${synergy.id}_${Date.now()}`,
            synergyId: synergy.id,
            elapsed: 0,
            duration: this.getSynergyDuration(synergy),
            tier: synergy.tier
        };
        comp.activeEffects.push(effect);

        // Set Cooldown
        comp.cooldowns.set(synergy.id, synergy.cooldown);

        // Track Stats
        comp.discovered.add(synergy.id);
        comp.stats.set(synergy.id, (comp.stats.get(synergy.id) || 0) + 1);

        // Notification
        this.createSynergyNotification(player, synergy, state);
    }

    private removeSynergyEffects(player: Player | Bot, synergyId: string, state: GameState) {
        // Implementation matches removeSynergyEffects in old manager
        // We strictly delete the flags
        // Ideally these flags should also be components/modifiers, but for hybrid:
        delete player.statusEffects.neutralPurification;
        delete player.statusEffects.purificationRadius;
        delete player.statusEffects.overdriveExplosive;
        delete player.statusEffects.explosiveSpeed;
        delete player.statusEffects.explosionRadius;
        delete player.statusEffects.goldenAttraction;
        delete player.statusEffects.catalystAttractionRadius;
        delete player.statusEffects.goldenMagneticForce;
        delete player.statusEffects.elementalBalance;
        delete player.statusEffects.solventShieldPower;
        delete player.statusEffects.shieldSolventSynergy;
        delete player.statusEffects.colorImmunity;
        delete player.statusEffects.chromaticImmunityDuration;
        delete player.statusEffects.catalystMasteryRadius;
        delete player.statusEffects.catalystGuarantee;
        delete player.statusEffects.neutralGodMode;
        delete player.statusEffects.kineticExplosion;
        delete player.statusEffects.explosionDamage;
        delete player.statusEffects.shieldPiercing;
        delete player.statusEffects.absoluteMastery;
        delete player.statusEffects.colorControl;
        delete player.statusEffects.perfectMatchThreshold;
        delete player.statusEffects.catalystGuarantee;
        delete player.statusEffects.neutralGodMode;
        delete player.statusEffects.temporalDistortion;
        delete player.statusEffects.timeManipulation;
        delete player.statusEffects.speedAmplifier;
        delete player.statusEffects.explosionTimeDilation;
    }

    private isSynergyOnCooldown(comp: SynergyComponent, id: string): boolean {
        return (comp.cooldowns.get(id) || 0) > 0;
    }

    private hasRequiredTattoos(playerTattoos: string[], required: string[]): boolean {
        return required.every(t => playerTattoos.includes(t));
    }

    private meetsUnlockRequirements(player: Player | Bot, synergy: TattooSynergy): boolean {
        const req = synergy.unlockRequirement;
        if (req.minPlayerLevel && player.radius < 15 + req.minPlayerLevel * 5) return false;
        if (req.minMatchPercent && player.matchPercent < req.minMatchPercent) return false;
        if (req.specificSituation && !this.isInSpecificSituation(player, req.specificSituation)) return false;
        return true;
    }

    private isInSpecificSituation(player: Player | Bot, situation: string): boolean {
        switch (situation) {
            case 'in_combat': return player.lastHitTime < 1.0;
            case 'high_speed':
                const speed = Math.hypot(player.velocity.x, player.velocity.y);
                return speed > 300;
            case 'low_health': return player.currentHealth < player.maxHealth * 0.3;
            default: return true;
        }
    }

    private getSynergyDuration(synergy: TattooSynergy): number {
        switch (synergy.tier) {
            case 'basic': return 10.0;
            case 'advanced': return 15.0;
            case 'master': return 20.0;
            case 'legendary': return 30.0;
            default: return 10.0;
        }
    }

    private createSynergyNotification(player: Player | Bot, synergy: TattooSynergy, state: GameState) {
        // Only show for main player? Or everyone if close?
        // For now, everyone creates floating text
        const tierEmoji = {
            basic: '⭐',
            advanced: '⭐⭐',
            master: '⭐⭐⭐',
            legendary: '⭐⭐⭐⭐'
        };
        const message = `${tierEmoji[synergy.tier]} ${synergy.name}`;
        createFloatingText(player.position, message, synergy.visualEffect.particleColor, 24, state);
    }
}

export const synergySystem = new SynergySystem();
