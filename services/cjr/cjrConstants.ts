import { RingId } from "./cjrTypes";
import { WAVE_CONFIG } from '../../constants';

// EIDOLON-V FIX: Re-export from Root Source of Truth
// Prevents duplication between Client (constants.ts) and Game Logic (cjrConstants.ts)
export { 
  RING_RADII, 
  THRESHOLDS, 
  COMMIT_BUFFS, 
  COLOR_PALETTE,
  WAVE_CONFIG,
  BOSS_CONFIGS
} from '../../constants';

// CJR-specific extensions not in root constants
export const WAVE_CONFIGS = WAVE_CONFIG;
