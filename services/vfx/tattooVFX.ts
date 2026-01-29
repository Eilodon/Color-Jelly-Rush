import { GameState, Player } from '../../types';
import { TattooId } from '../cjr/cjrTypes';
import { vfxBuffer, VFX_TYPES, packHex, TEXT_IDS } from '../engine/VFXRingBuffer';

export class TattooVFXSystem {

  playTattooActivationVFX(player: Player, tattooId: TattooId, state: GameState): void {
    // Push Event: "tattoo:playerId:tattooId"
    const { vfxSystem } = require('./vfxSystem');
    // Type 7 = Tattoo Proc
    // Note: Data is number, but we need tattoo ID. 
    // Currently dropped or need to map Enum to Int in future. For now visual cue generic.
    vfxSystem.emitVFX(state, 7, player.position.x, player.position.y, 0, player.id);

    // Floating Text (Zero-GC)
    vfxBuffer.push(
      player.position.x,
      player.position.y - 60,
      packHex('#a855f7'),
      VFX_TYPES.FLOATING_TEXT,
      TEXT_IDS.MUTATION
    );
  }

  updateEffects(state: GameState, dt: number): void {
    // Không còn cần quản lý active effects trong state nữa
    // CrystalVFX tự quản lý vòng đời particle
  }
}

export const tattooVFXSystem = new TattooVFXSystem();
