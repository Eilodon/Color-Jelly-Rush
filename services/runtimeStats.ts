import type { QualityMode } from './settings';

export type GameplayTelemetry = {
  ring2EntryTime?: number;
  ring3EntryTime?: number;
  maxMatchPercent: number;
  kills: number;
  deathCount: number;
  bossDamageDealt: number;
};

export type RuntimeStats = {
  fpsNow: number;
  fpsAvg: number;
  appliedQuality: Exclude<QualityMode, 'auto'>;
  dpr: number;
  gameplay: GameplayTelemetry;
};

const listeners = new Set<() => void>();

let stats: RuntimeStats = {
  fpsNow: 0,
  fpsAvg: 0,
  appliedQuality: 'high',
  dpr: 1,
  gameplay: {
    maxMatchPercent: 0,
    kills: 0,
    deathCount: 0,
    bossDamageDealt: 0
  }
};

export const getRuntimeStats = (): RuntimeStats => stats;

export const setRuntimeStats = (partial: Partial<RuntimeStats>) => {
  stats = { ...stats, ...partial };
  listeners.forEach((listener) => listener());
};

export const updateGameplayStats = (update: Partial<GameplayTelemetry>) => {
  stats.gameplay = { ...stats.gameplay, ...update };
  listeners.forEach(l => l());
};

export const subscribeRuntimeStats = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

