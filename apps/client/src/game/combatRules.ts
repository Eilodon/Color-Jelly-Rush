import { DANGER_THRESHOLD_RATIO, EAT_THRESHOLD_RATIO } from '../constants';

// EIDOLON-V: Integer States
export const enum InteractionType {
  COMBAT = 0,
  CONSUME = 1,
  AVOID = 2,
}

export type SizeInteraction = InteractionType;

export const getSizeInteraction = (
  ratio: number,
  predatorShielded: boolean,
  preyShielded: boolean,
  predatorCharging: boolean,
  preyCharging: boolean
): InteractionType => {
  if (ratio >= DANGER_THRESHOLD_RATIO && !preyShielded && !preyCharging) {
    return InteractionType.CONSUME;
  }
  if (ratio <= EAT_THRESHOLD_RATIO && !predatorShielded && !predatorCharging) {
    return InteractionType.AVOID;
  }
  return InteractionType.COMBAT;
};
