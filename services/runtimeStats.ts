import type { QualityMode } from './settings';

export type RuntimeStats = {
  fpsNow: number;
  fpsAvg: number;
  appliedQuality: Exclude<QualityMode, 'auto'>;
  dpr: number;
};

const listeners = new Set<() => void>();

let stats: RuntimeStats = {
  fpsNow: 0,
  fpsAvg: 0,
  appliedQuality: 'high',
  dpr: 1,
};

export const getRuntimeStats = (): RuntimeStats => stats;

export const setRuntimeStats = (partial: Partial<RuntimeStats>) => {
  stats = { ...stats, ...partial };
  listeners.forEach((listener) => listener());
};

export const subscribeRuntimeStats = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

