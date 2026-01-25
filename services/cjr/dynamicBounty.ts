
import { GameState } from '../../types';
import { createFood } from '../engine/factories';
import { CENTER_RADIUS } from '../../constants';
import { createFloatingText } from '../engine/effects';

export const updateDynamicBounty = (state: GameState, dt: number) => {
    // Only spawn if logic condition met
    // Condition: < 30% players in Ring 3?
    // Or just random chance for now + timer

    if (!state.runtime.wave) return; // Basic check

    // Simplified: Check for Candy Vein existence
    const veinExists = state.food.some(f => f.kind === 'candy_vein');

    if (!veinExists) {
        // 1/2000 chance per tick ~ once every 30s
        if (Math.random() < 0.0005) {
            spawnCandyVein(state);
        }
    }
};

const spawnCandyVein = (state: GameState) => {
    // Spawn near center but outside absolute win zone
    const angle = Math.random() * Math.PI * 2;
    const r = CENTER_RADIUS + 100; // Just outside win zone

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    const vein = createFood({ x, y });
    vein.kind = 'candy_vein';
    vein.value = 50; // HUGE
    vein.radius = 25;
    vein.color = '#ffd700';
    // Unique pulsing visual usually handled by renderer via kind check

    state.food.push(vein);

    // Global announcement?
    state.floatingTexts.push({
        id: `announce_${Date.now()}`,
        position: { x: 0, y: 0 },
        text: "CANDY VEIN APPEARED!",
        color: "#ffd700",
        size: 30,
        life: 3,
        velocity: { x: 0, y: -20 }
    });
};
