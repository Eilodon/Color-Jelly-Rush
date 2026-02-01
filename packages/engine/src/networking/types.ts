/**
 * Network Input Types
 * Shared between client and server
 */

export interface NetworkInput {
  seq: number;
  targetX: number;
  targetY: number;
  space: boolean; // skill activation
  w: boolean;     // eject
}

export interface NetworkSnapshot {
  time: number;
  players: Map<string, EntitySnapshot>;
  bots: Map<string, EntitySnapshot>;
  food: Map<string, EntitySnapshot>;
}

export interface EntitySnapshot {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius?: number;
}

export enum ServerEventType {
  ENTITY_DEATH = 1,
  RING_COMMIT = 2,
  TATTOO_UNLOCK = 3,
  GAME_OVER = 4,
  ENTITY_SPAWN = 5,
}

export interface ServerEvent {
  type: ServerEventType;
  entityId: string;
  data?: number;
  x?: number;
  y?: number;
}
