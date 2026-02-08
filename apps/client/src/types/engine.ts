// EIDOLON-V: Type-safe Game Engine Interface
import { Entity, Particle } from './entity';
import { PhysicsWorld } from '../game/engine/PhysicsWorld';

// Define interface for the SpatialGrid adapter used in context.ts
export interface ISpatialGrid {
  clear(): void;
  clearDynamic(): void;
  insert(_entity: Entity): void;
  insertStatic(_entity: Entity): void;
  removeStatic(_entity: Entity): void;
  getNearby(_entity: Entity, _maxDistance?: number): Entity[];
  getNearbyInto(
    _entity: Entity,
    _outArray: Entity[],
    _indices: number[],
    _maxDistance?: number
  ): number;
}

// Define interface for ParticlePool used in context.ts
export interface IParticlePool {
  get(_x: number, _y: number, _color: string, _speed: number): Particle;
  release(_particle: Particle): void;
}

import { WorldState } from '@cjr/engine';

export interface IGameEngine {
  readonly world: WorldState;
  readonly spatialGrid: ISpatialGrid;
  readonly particlePool: IParticlePool;
  readonly physicsWorld: PhysicsWorld;
}

export interface GameEngineConfig {
  worldWidth: number;
  worldHeight: number;
  cellSize: number;
}
