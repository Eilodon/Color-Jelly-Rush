import type { QualityMode } from './settings';

export type RuntimeStats = {
  fpsNow: number;
  fpsAvg: number;
  appliedQuality: Exclude<QualityMode, 'auto'>;
  dpr: number;
};

const listeners = new Set<() => void>();

// Mutable Singleton
const stats: RuntimeStats = {
  fpsNow: 0,
  fpsAvg: 0,
  appliedQuality: 'high',
  dpr: 1,
};

export const getRuntimeStats = (): RuntimeStats => stats;

// EIDOLON-V: Zero Allocation Update
export const setRuntimeStats = (partial: Partial<RuntimeStats>) => {
  // Mutate directly
  if (partial.fpsNow !== undefined) stats.fpsNow = partial.fpsNow;
  if (partial.fpsAvg !== undefined) stats.fpsAvg = partial.fpsAvg;
  if (partial.appliedQuality !== undefined) stats.appliedQuality = partial.appliedQuality;
  if (partial.dpr !== undefined) stats.dpr = partial.dpr;

  // Notify listeners (UI updates)
  // Warning: If listeners are React components, they might need forceUpdate
  // or use a specialized hook that reads the mutable ref.
  listeners.forEach((listener) => listener());
};

export const subscribeRuntimeStats = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
