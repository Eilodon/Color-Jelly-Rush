// services/engine/effects.ts
import { GameState, Vector2, Player, Bot } from '../../types';

export const createExplosion = (position: Vector2, color: string, count: number, state: GameState) => {
  // Format: "explode:x:y:color:count"
  state.vfxEvents.push(`explode:${position.x.toFixed(1)}:${position.y.toFixed(1)}:${color}:${count}`);
};

export const createDeathExplosion = (position: Vector2, color: string, radius: number, state: GameState) => {
  // Đã thêm `state` vào tham số
  createExplosion(position, color, Math.floor(radius / 2), state);

  // Thêm shockwave event nếu muốn
  // state.vfxEvents.push(`shockwave:${position.x}:${position.y}:${radius}`);
};

export const createFloatingText = (
  position: Vector2,
  text: string,
  color: string,
  size: number,
  state: GameState
) => {
  state.floatingTexts.push({
    id: Math.random().toString(),
    position: { ...position },
    text,
    color,
    size,
    life: 1.0,
    velocity: { x: 0, y: -20 }
  });
};

export const notifyPlayerDamage = (victim: Player | Bot) => { };
