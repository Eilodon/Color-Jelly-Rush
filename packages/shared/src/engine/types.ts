// EIDOLON-V MONOREPO: Shared game engine types and interfaces
// These types are used by both client and server

import { PigmentVec3, TattooId, ShapeId, Emotion } from '../types';

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameRuntimeState {
  player: Player;
  bots: Bot[];
  food: Food[];
  projectiles: Projectile[];
  camera: CameraState;
  worldSize: { width: number; height: number };
  isPaused: boolean;
  result: 'win' | 'lose' | null;
  level: number;
  runtime: RuntimeState;
  tattooChoices: TattooId[] | null;
}

export interface Player {
  id: string;
  name: string;
  position: Vector2;
  velocity: Vector2;
  targetPosition: Vector2;
  radius: number;
  color: PigmentVec3;
  shape: ShapeId;
  emotion: Emotion;
  mass: number;
  matchPercent: number;
  isKing: boolean;
  physicsIndex?: number;
  statusFlags: number;
  statusTimers: StatusTimers;
  statusMultipliers: StatusMultipliers;
  statusScalars: StatusScalars;
  tattoos: TattooId[];
}

export interface Bot extends Player {
  aiState: AIState;
  personality: BotPersonality;
}

export interface Food {
  id: string;
  position: Vector2;
  radius: number;
  color: PigmentVec3;
  kind: 'pigment' | 'neutral' | 'solvent' | 'catalyst' | 'shield' | 'candy_vein';
  physicsIndex?: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: PigmentVec3;
  physicsIndex?: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  shake: number;
}

export interface RuntimeState {
  elapsed: number;
  wave: WaveState;
  zoneRadius: number;
}

export interface WaveState {
  ring1: number;
  ring2: number;
  ring3: number;
}

export interface StatusTimers {
  shield: number;
  speedBoost: number;
  commitDebuff: number;
}

export interface StatusMultipliers {
  speed: number;
  damageTaken: number;
  damageDealt: number;
  growth: number;
}

export interface StatusScalars {
  commitStacks: number;
}

export interface AIState {
  targetId: string | null;
  state: 'idle' | 'chase' | 'flee' | 'farm';
  lastDecisionTime: number;
}

export interface BotPersonality {
  aggression: number;
  caution: number;
  farming: number;
}
