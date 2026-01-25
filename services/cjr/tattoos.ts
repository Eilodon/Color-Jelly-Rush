
import { TattooTier, Player, Bot, Food, GameState } from '../../types';
import { TattooId } from './cjrTypes';
import { COLOR_BALANCE } from './balance';
import { vfxIntegrationManager } from '../vfx/vfxIntegration';
import { mixPigment, calcMatchPercent, pigmentToHex } from './colorMath';
import { createFloatingText } from '../engine/effects';
import { createParticle, createFood } from '../engine/factories';

export interface TattooDefinition {
    id: TattooId;
    name: string;
    tier: TattooTier;
    description: string;
    apply: (player: Player) => void;
    // Event hooks for tattoo effects
    onConsume?: (entity: Player | Bot, food: Food, state: GameState) => void;
    onHit?: (victim: Player | Bot, attacker: Player | Bot, state: GameState) => void;
    onSkill?: (player: Player, state: GameState) => void;
    onUpdate?: (player: Player, dt: number, state: GameState) => void;
}

const TATTOOS: TattooDefinition[] = [
    {
        id: TattooId.FilterInk,
        name: 'Filter Ink',
        tier: TattooTier.Common,
        description: 'Reduce impact of wrong pigments by 40%.',
        apply: (player: Player) => {
            player.statusEffects.wrongPigmentReduction = 0.6; // 40% reduction
        },
        onConsume: (entity: Player | Bot, food: Food, state: GameState) => {
            if (food.kind === 'pigment' && food.pigment) {
                const pigmentMatch = calcMatchPercent(food.pigment, entity.targetPigment);
                if (pigmentMatch < 0.6) {
                    // Handled in combat.ts logic via statusEffects.wrongPigmentReduction
                }
            }
        }
    },
    {
        id: TattooId.Overdrive,
        name: 'Overdrive',
        tier: TattooTier.Common,
        description: 'Skill triggers 3s fast-eat mode.',
        apply: (player: Player) => {
            player.statusEffects.overdriveActive = true;
        },
        onSkill: (player: Player, state: GameState) => {
            player.statusEffects.overdriveTimer = 3.0; // 3s boost to growth
            createFloatingText(player.position, 'Overdrive!', '#FF5722', 20, state);
        }
    },
    {
        id: TattooId.DepositShield,
        name: 'Deposit Shield',
        tier: TattooTier.Common,
        description: 'Gain shield while holding core (Ring 3).',
        apply: (player: Player) => {
            player.statusEffects.coreShieldBonus = true;
        },
        onUpdate: (player: Player, dt: number, state: GameState) => {
            // If in Ring 3 and high match (holding), grant shield
            if (player.ring === 3 && player.matchPercent > 0.8) {
                player.statusEffects.shielded = true;
                player.statusEffects.commitShield = 0.1; // Refreshing shield
            }
        }
    },
    {
        id: TattooId.PigmentBomb,
        name: 'Pigment Bomb',
        tier: TattooTier.Common,
        description: 'Getting hit splashes 30% of your color on enemy.',
        apply: (player: Player) => {
            player.statusEffects.pigmentBombActive = true;
            player.statusEffects.pigmentBombChance = 0.3;
        },
        onHit: (victim: Player | Bot, attacker: Player | Bot, state: GameState) => {
            if (victim.tattoos?.includes(TattooId.PigmentBomb)) {
                const chance = victim.statusEffects.pigmentBombChance || 0.3;
                if (Math.random() < chance && 'pigment' in attacker) {
                    const att = attacker as Player | Bot;
                    att.pigment = mixPigment(att.pigment, victim.pigment, 0.15);
                    att.color = pigmentToHex(att.pigment);
                    att.matchPercent = calcMatchPercent(att.pigment, att.targetPigment);
                    createFloatingText(att.position, 'INKED!', '#ff66cc', 18, state);
                }
            }
        }
    },
    {
        id: TattooId.PerfectMatch,
        name: 'Perfect Match Bonus',
        tier: TattooTier.Rare,
        description: 'Match ≥85% grants 50% extra mass and speed.',
        apply: (player: Player) => {
            player.statusEffects.perfectMatchThreshold = 0.85;
            player.statusEffects.perfectMatchBonus = 1.5;
        },
        onUpdate: (player: Player, dt: number, state: GameState) => {
            if (player.matchPercent >= 0.85) {
                player.statusEffects.speedBoost = Math.max(player.statusEffects.speedBoost, 1.2);
            }
        }
    },
    {
        id: TattooId.CatalystSense,
        name: 'Catalyst Sense',
        tier: TattooTier.Rare,
        description: 'Attract catalysts from 2x distance and highlight them.',
        apply: (player: Player) => {
            player.statusEffects.catalystSenseRange = 2.0;
            player.statusEffects.catalystSenseActive = true;
        }
    },
    {
        id: TattooId.NeutralMastery,
        name: 'Neutral Mastery',
        tier: TattooTier.Rare,
        description: 'Neutral pickups give 25% extra mass.',
        apply: (player: Player) => {
            player.statusEffects.neutralMassBonus = 1.25;
        }
    },
    {
        id: TattooId.SolventExpert,
        name: 'Solvent Expert',
        tier: TattooTier.Epic,
        description: 'Solvent cleanses 2x faster and provides brief speed boost.',
        apply: (player: Player) => {
            player.statusEffects.solventPower = 2.0;
            player.statusEffects.solventSpeedBoost = 1.2;
        }
    },
    {
        id: TattooId.CatalystEcho,
        name: 'Catalyst Echo',
        tier: TattooTier.Common,
        description: 'Catalysts last longer and grant extra mass.',
        apply: (player: Player) => {
            player.statusEffects.catalystEchoBonus = 1.3;
            player.statusEffects.catalystEchoDuration = 2.0;
        }
    },
    {
        id: TattooId.PrismGuard,
        name: 'Prism Guard',
        tier: TattooTier.Rare,
        description: 'Match ≥80% reduces incoming damage by 20%.',
        apply: (player: Player) => {
            player.statusEffects.prismGuardThreshold = 0.8;
            player.statusEffects.prismGuardReduction = 0.8;
        }
    },
    {
        id: TattooId.InkLeech,
        name: 'Ink Leech',
        tier: TattooTier.Epic,
        description: 'Deal damage to heal for 20% of it.',
        apply: (player: Player) => {
            player.lifesteal = Math.max(player.lifesteal || 0, 0.2);
        }
    },
    {
        id: TattooId.GrimHarvest,
        name: 'Grim Harvest',
        tier: TattooTier.Epic,
        description: 'Killing enemies spawns neutral mass.',
        apply: (player: Player) => {
            player.statusEffects.grimHarvestDropCount = 2;
        }
    },

    // --- NEW TATTOOS ---
    {
        id: TattooId.SpeedSurge,
        name: 'Speed Surge',
        tier: TattooTier.Common,
        description: 'Passive 15% speed boost. Dash is cheaper.',
        apply: (player: Player) => {
            player.statusEffects.speedSurge = 1;
            player.statusEffects.speedBoost = Math.max(player.statusEffects.speedBoost, 1.15);
            player.skillCooldownMultiplier = 1.5; // Faster recharge
        }
    },
    {
        id: TattooId.Invulnerable,
        name: 'Titan Skin',
        tier: TattooTier.Epic,
        description: 'Start with 3s invulnerability. Gain 50% defense.',
        apply: (player: Player) => {
            player.statusEffects.invulnerable = 3.0; // Start invuln
            player.defense *= 1.5;
        }
    },
    {
        id: TattooId.Rewind,
        name: 'Time Anchor',
        tier: TattooTier.Legendary,
        description: 'Fatal damage restores 50% HP and rewinds position (once/run).',
        apply: (player: Player) => {
            player.reviveAvailable = true;
        },
        onUpdate: (player: Player, dt: number, state: GameState) => {
            // Record history for rewind? (Heavy, maybe simplify to just revive)
        }
    },
    {
        id: TattooId.Magnet,
        name: 'Void Magnet',
        tier: TattooTier.Rare,
        description: 'Significantly increased pickup radius.',
        apply: (player: Player) => {
            player.magneticFieldRadius = 150;
            player.statusEffects.magnetTimer = 9999;
        }
    },
    {
        id: TattooId.KingForm,
        name: 'Crown of Light',
        tier: TattooTier.Legendary,
        description: 'Win requirement reduced to 85%. You glow with authority.',
        apply: (player: Player) => {
            // Logic handled in winCondition.ts to check this ID? 
            // Or just reduce threshold directly if possible, but threshold is constant.
            // We can check tattoos in winCondition logic.
        }
    }
];

export const getTattooById = (id: TattooId) => TATTOOS.find(t => t.id === id);

export const applyTattoo = (player: Player, id: TattooId, state?: any) => {
    const t = getTattooById(id);
    if (t) {
        if (!player.tattoos.includes(id)) {
            player.tattoos.push(id);
            t.apply(player);

            // Play tattoo activation VFX
            if (state) {
                vfxIntegrationManager.handleTattooActivation(player, id, state);
            }
        }
    }
};

export interface TattooChoice {
    id: TattooId;
    name: string;
    tier: TattooTier;
    description: string;
}

export const getTattooChoices = (count: number): TattooChoice[] => {
    const shuffled = [...TATTOOS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(m => ({
        id: m.id,
        name: m.name,
        tier: m.tier,
        description: m.description
    }));
};
