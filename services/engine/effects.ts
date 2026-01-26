// services/engine/effects.ts
import { GameState, Vector2, Player, Bot } from '../../types';
import { vfxBuffer, VFX_TYPES, packRGB } from './VFXRingBuffer';

export const createExplosion = (position: Vector2, color: string, count: number, state: GameState) => {
  // EIDOLON-V FIX: Zero-allocation VFX events
  // Parse RGB color string to packed integer
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  let packedColor = 0xffffff; // Default white
  
  if (rgbMatch) {
    packedColor = packRGB(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    );
  }
  
  // Add to ring buffer (no string allocation)
  vfxBuffer.push(position.x, position.y, packedColor, VFX_TYPES.EXPLODE, count);
};

export const createDeathExplosion = (position: Vector2, color: string, radius: number, state: GameState) => {
  // EIDOLON-V FIX: Use ring buffer
  createExplosion(position, color, Math.floor(radius / 2), state);

  // Add shockwave event if needed
  // vfxBuffer.push(position.x, position.y, 0xffffff, VFX_TYPES.SHOCKWAVE, radius);
};

export const createFloatingText = (
  position: Vector2,
  text: string,
  color: string,
  size: number,
  state: GameState
) => {
  // EIDOLON-V FIX: Convert text to char code for storage
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  let packedColor = 0xffff00; // Default yellow
  
  if (rgbMatch) {
    packedColor = packRGB(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    );
  }
  
  // Store first character as data (for simple floating text)
  const charCode = text.charCodeAt(0);
  vfxBuffer.push(position.x, position.y, packedColor, VFX_TYPES.FLOATING_TEXT, charCode);
};

export const notifyPlayerDamage = (victim: Player | Bot) => { };
