// EIDOLON-V FIX: Optimized Game Engine with Batch Processing
// Eliminates O(n²) complexity and reduces function call overhead

import { GameState, Player, Bot, Food, Entity, Projectile } from '../../types';
import { gameStateManager } from './GameStateManager';
import { bindEngine, getCurrentSpatialGrid, getCurrentEngine } from './context';

import { updateAI } from './systems/ai';
import { applyProjectileEffect, resolveCombat, consumePickupDOD } from './systems/combat';
import { applySkill } from './systems/skills';
import { EntityFlags } from './dod/EntityFlags';
import { updateRingLogic } from '../cjr/ringSystem';
import { updateWaveSpawner, resetWaveTimers } from '../cjr/waveSpawner';
import { updateWinCondition } from '../cjr/winCondition';
import { updateBossLogic, resetBossState } from '../cjr/bossCjr';
import { updateDynamicBounty } from '../cjr/dynamicBounty';
import { updateEmotion } from '../cjr/emotions';
import { assignRandomPersonality } from '../cjr/botPersonalities';
import { getTattooChoices } from '../cjr/tattoos';
import { TattooId } from '../cjr/cjrTypes';
import { getLevelConfig } from '../cjr/levels';
import { vfxIntegrationManager } from '../vfx/vfxIntegration';
import { tattooSynergyManager } from '../cjr/tattooSynergies';

import { resetContributionLog } from '../cjr/contribution';
import { entityManager } from './dod/EntityManager'; // EIDOLON-V: DOD Manager

import { pooledEntityFactory } from '../pooling/ObjectPool';
import { filterInPlace } from '../utils/arrayUtils';
import { PhysicsSystem } from './dod/systems/PhysicsSystem';
import { MovementSystem } from './dod/systems/MovementSystem';
import { TransformStore, PhysicsStore, EntityLookup, StatsStore, StateStore, SkillStore, TattooStore, ProjectileStore } from './dod/ComponentStores';
import { SkillSystem } from './dod/systems/SkillSystem';
import { TattooSystem } from './dod/systems/TattooSystem';

// EIDOLON-V FIX: Batch processing system to reduce function call overhead
interface EntityBatch {
  players: Player[];
  bots: Bot[];
  projectiles: Entity[];
  food: Food[];
  // EIDOLON-V FIX: Removed 'all' to prevent polymorphism de-opt
}

// EIDOLON-V FIX: Object pool for entity arrays
class PersistentBatch {
  public players: Player[] = [];
  public bots: Bot[] = [];
  public projectiles: Entity[] = [];
  public food: Food[] = [];

  clear(): void {
    this.players.length = 0;
    this.bots.length = 0;
    this.projectiles.length = 0;
    this.food.length = 0;
  }
}

// EIDOLON-V FIX: Optimized game engine with batch processing
class OptimizedGameEngine {
  private static instance: OptimizedGameEngine;
  private spatialGrid: any;
  private batch: PersistentBatch;
  private frameCount: number = 0;

  // EIDOLON-V: Shared buffer for spatial queries (Zero-GC)
  private _queryBuffer: number[] = [];

  private constructor() {
    // EIDOLON-V FIX: Don't require spatial grid in constructor
    // It will be bound when engine is properly initialized
    this.batch = new PersistentBatch();
  }

  public static getInstance(): OptimizedGameEngine {
    if (!OptimizedGameEngine.instance) {
      OptimizedGameEngine.instance = new OptimizedGameEngine();
    }
    return OptimizedGameEngine.instance;
  }

  // EIDOLON-V FIX: Zero Allocation Entity Collection
  private collectEntities(state: GameState): EntityBatch {
    // Đảm bảo state.players luôn là mảng valid
    if (!state.players || state.players.length === 0) {
      if (state.player) state.players = [state.player];
      else state.players = [];
    }

    // Clear batch arrays (giữ nguyên tham chiếu mảng, chỉ reset length = 0)
    this.batch.clear();

    const { players, bots, projectiles, food } = this.batch;

    // Fill arrays - ZERO ALLOCATION (Không dùng map/filter/concat)
    // 1. Players
    const sourcePlayers = state.players;
    for (let i = 0; i < sourcePlayers.length; i++) {
      players.push(sourcePlayers[i]);
    }

    // 2. Bots
    const sourceBots = state.bots;
    for (let i = 0; i < sourceBots.length; i++) {
      bots.push(sourceBots[i]);
    }

    // 3. Projectiles
    const sourceProj = state.projectiles;
    for (let i = 0; i < sourceProj.length; i++) {
      projectiles.push(sourceProj[i]);
    }

    // 4. Food
    const sourceFood = state.food;
    for (let i = 0; i < sourceFood.length; i++) {
      food.push(sourceFood[i]);
    }

    return this.batch;
  }

  // EIDOLON-V FIX: Return arrays to pool
  // No-op for persistent batch
  private returnArrays(batch: EntityBatch): void {
    // Intentionally empty
  }

  // EIDOLON-V FIX: Correct Physics Integration Pipeline
  private integratePhysics(batch: EntityBatch, dt: number): void {
    const world = getCurrentEngine().physicsWorld;

    // BƯỚC 1: PUSH (Sync từ Logic game -> Physics World)
    // DISABLED: Logic writes directly to DOD Stores (Phase 6)
    // world.syncBodiesFromBatch(batch.players);
    // world.syncBodiesFromBatch(batch.bots);

    // BƯỚC 2: EXECUTE (Chạy mô phỏng vật lý SoA)
    // DOD Physics update
    PhysicsSystem.update(dt);

    // BƯỚC 3: PULL (Sync từ Physics World -> Logic game)
    // DISABLED: Logic reads directly from DOD Stores (Phase 6)
    // Sync is only needed for rendering or network serialization step, 
    // which happens later or in separate system.
    // this.syncBatchFromDOD(batch.players);
    // this.syncBatchFromDOD(batch.bots);
  }

  private syncBatchFromDOD(entities: Entity[]): void {
    const tData = TransformStore.data;
    const pData = PhysicsStore.data;
    const sData = StatsStore.data; // EIDOLON-V: Stats Access
    const stateFlags = StateStore.flags;

    const count = entities.length;
    for (let i = 0; i < count; i++) {
      const ent = entities[i];
      const idx = ent.physicsIndex;
      if (idx !== undefined) {
        const tIdx = idx * 8;
        const pIdx = idx * 8;
        const sIdx = idx * 8; // Stats Stride 8

        ent.position.x = tData[tIdx];
        ent.position.y = tData[tIdx + 1];
        ent.velocity.x = pData[pIdx];
        ent.velocity.y = pData[pIdx + 1];

        // Sync Stats
        if ('score' in ent) {
          const unit = ent as any;
          unit.currentHealth = sData[sIdx];
          // ent.maxHealth = sData[sIdx+1]; // Usually static or managed by upgrades
          unit.score = sData[sIdx + 2];
          unit.matchPercent = sData[sIdx + 3];
        }

        // Sync Dead Flag
        ent.isDead = (stateFlags[idx] & EntityFlags.DEAD) !== 0;
      }
    }
  }

  // EIDOLON-V FIX: Optimized spatial grid updates
  private updateSpatialGrid(batch: EntityBatch): void {
    const grid = this.spatialGrid;

    // EIDOLON-V: Chỉ clear dynamic entities (Player, Bot, Projectile)
    grid.clearDynamic();

    // Re-insert dynamic entities explicitly by type to avoid Type Pollution
    const { players, bots, projectiles } = batch;

    for (let i = 0; i < players.length; i++) {
      grid.insert(players[i]);
    }

    for (let i = 0; i < bots.length; i++) {
      grid.insert(bots[i]);
    }

    for (let i = 0; i < projectiles.length; i++) {
      grid.insert(projectiles[i]);
    }
  }

  // EIDOLON-V FIX: Batch logic updates (DOD Optimized)
  private updateLogic(state: GameState, dt: number): void {
    // EIDOLON-V: Index-based iteration
    const count = entityManager.count;
    const flags = StateStore.flags;

    for (let i = 0; i < count; i++) {
      const flag = flags[i];
      // Bitmask Check: Active & (Player or Bot)
      if ((flag & EntityFlags.ACTIVE) && (flag & (EntityFlags.PLAYER | EntityFlags.BOT))) {
        this.updateEntityDOD(i, state, dt);
      }
    }

    // Update projectiles (Hybrid - keep object loop for now until Projectile system is fully DOD)
    this.updateProjectiles(state, dt);

    // Update visual effects
    this.cleanupTransientEntities(state);
  }

  // EIDOLON-V FIX: Unified DOD Entity Update
  private updateEntityDOD(index: number, state: GameState, dt: number): void {
    const flag = StateStore.flags[index];
    const isBot = (flag & EntityFlags.BOT) !== 0;

    // 1. AI Logic (Hybrid Override)
    if (isBot) {
      const botObj = EntityLookup[index] as Bot;
      if (botObj && !botObj.isDead) {
        updateAI(botObj, state, dt);
      }
    }

    // 2. Movement Logic (DOD)
    // We need targetPosition from somewhere. For players it's on the object.
    // For bots it's set by AI.
    let targetPos: { x: number, y: number } | null = null;
    let maxSpeed = 0;
    let speedMult = 1;

    // Access Object for high-level state (Target/Speed)
    // TODO: Move MaxSpeed and TargetPosition to DOD Store later
    const entityObj = EntityLookup[index] as Player | Bot;
    if (entityObj) {
      if (entityObj.isDead) return;
      targetPos = entityObj.targetPosition;
      maxSpeed = entityObj.maxSpeed;
      speedMult = entityObj.statusMultipliers.speed || 1;

      // EIDOLON-V: Visual Juice Decay
      if (entityObj.aberrationIntensity && entityObj.aberrationIntensity > 0) {
        entityObj.aberrationIntensity -= dt * 3.0; // Decay speed
        if (entityObj.aberrationIntensity < 0) entityObj.aberrationIntensity = 0;
      }
    }

    if (targetPos) {
      MovementSystem.applyInputDOD(
        index,
        targetPos,
        { maxSpeed, speedMultiplier: speedMult },
        dt
      );
    }

    // 3. Player Specifics (Input & Magnet)
    if (!isBot && entityObj) {
      const player = entityObj as Player;
      // Skill Input
      if (player.inputs?.space) {
        SkillSystem.handleInput(index, { space: player.inputs.space, target: player.targetPosition }, state);
      }
      // Magnet
      this.updateMagnetLogic(player, state, dt);
    }

    // 4. Stats Regen (DOD)
    const sIdx = index * StatsStore.STRIDE;
    // Stats[0] = current, Stats[1] = max
    let hp = StatsStore.data[sIdx];
    const maxHp = StatsStore.data[sIdx + 1];

    if (hp < maxHp && entityObj) {
      // Regen scalar from object for now
      const regen = entityObj.statusScalars.regen || 0;
      if (regen > 0) {
        hp += regen * dt;
        if (hp > maxHp) hp = maxHp;
        StatsStore.data[sIdx] = hp;
        entityObj.currentHealth = hp; // Sync back
      }
    }

    // 5. Cooldowns (Timers)
    if (entityObj) {
      entityObj.lastEatTime += dt;
      entityObj.lastHitTime += dt;

      // Sync Skill Cooldown from Store
      const skIdx = index * SkillStore.STRIDE;
      entityObj.skillCooldown = SkillStore.data[skIdx];

      if (entityObj.streakTimer > 0) {
        entityObj.streakTimer -= dt;
        if (entityObj.streakTimer <= 0) entityObj.killStreak = 0;
      }
    }

    // 6. Collision (DOD)
    // We pass the Object because resolving collision creates events/logic that needs the object
    if (entityObj) {
      this.checkUnitCollisions(entityObj, state, dt);
    }
  }

  // EIDOLON-V FIX: Batch CJR system updates
  private updateCJRSystems(batch: EntityBatch, state: GameState, dt: number): void {
    // Batch ring updates
    for (let i = 0; i < batch.players.length; i++) {
      updateRingLogic(batch.players[i], dt, state.levelConfig, state);
    }
    for (let i = 0; i < batch.bots.length; i++) {
      updateRingLogic(batch.bots[i], dt, state.levelConfig, state);
    }

    // Batch emotion updates
    for (let i = 0; i < batch.players.length; i++) {
      updateEmotion(batch.players[i], dt);
    }
    for (let i = 0; i < batch.bots.length; i++) {
      updateEmotion(batch.bots[i], dt);
    }

    // Batch tattoo synergy checks
    for (let i = 0; i < batch.players.length; i++) {
      tattooSynergyManager.checkSynergies(batch.players[i], state);
    }
  }

  // EIDOLON-V FIX: Magnet Logic (Optimized)
  private updateMagnetLogic(player: Player, state: GameState, dt: number): void {
    const rawGrid = (this.spatialGrid as any).grid;
    if (!rawGrid) return;

    if (player.physicsIndex === undefined) return;

    const catalystSense = player.tattoos.includes(TattooId.CatalystSense);
    const magnetRadius = player.magneticFieldRadius || 0;

    if (magnetRadius > 0 || catalystSense) {
      const catalystRange = (player.statusScalars.catalystSenseRange || 2.0) * 130;
      const searchRadius = catalystSense ? Math.max(catalystRange, magnetRadius) : magnetRadius;

      // DOD Read Player Position
      const tIdxP = player.physicsIndex * 8;
      const px = TransformStore.data[tIdxP];
      const py = TransformStore.data[tIdxP + 1];



      // EIDOLON-V: Reuse Buffer? No, indices is used below in loop.
      // But updateMagnetLogic is called from updateEntityDOD.
      // checkUnitCollisions is ALSO called in updateEntityDOD.
      // Since they are sequential, we can reuse this._queryBuffer!
      const indices = this._queryBuffer;
      indices.length = 0;

      rawGrid.queryRadiusInto(px, py, searchRadius, indices);

      const searchRadiusSq = searchRadius * searchRadius;
      const pullPower = 120 * dt;

      const tData = TransformStore.data;
      const pData = PhysicsStore.data;

      const count = indices.length;
      for (let i = 0; i < count; i++) {
        const idx = indices[i];
        if (idx === player.physicsIndex) continue;

        // EIDOLON-V: Flag Check (Bitmask)
        const flags = StateStore.flags[idx];

        // Check Active & Food
        if ((flags & (EntityFlags.ACTIVE | EntityFlags.FOOD)) !== (EntityFlags.ACTIVE | EntityFlags.FOOD)) continue;
        if (flags & EntityFlags.DEAD) continue;

        // Catalyst Check
        if (catalystSense && magnetRadius <= 0) {
          if ((flags & EntityFlags.FOOD_CATALYST) === 0) continue;
        }

        // DOD Read Target Position
        const tx = tData[idx * 8];
        const ty = tData[idx * 8 + 1];

        const dx = px - tx;
        const dy = py - ty;
        const distSq = dx * dx + dy * dy;

        if (distSq < searchRadiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const factor = pullPower / dist;

          // DOD Write Target Velocity (PhysicsStore)
          pData[idx * 8] += dx * factor;
          pData[idx * 8 + 1] += dy * factor;
        }
      }
    }
  }

  // EIDOLON-V FIX: Unit Collision (Optimized Index-Based & Bitmask)
  private checkUnitCollisions(entity: Player | Bot, state: GameState, dt: number): void {
    const rawGrid = (this.spatialGrid as any).grid;
    if (!rawGrid) return;

    // Cache Pointers (Local Stack)
    // EIDOLON-V: Use Shared Buffer
    const indices = this._queryBuffer;
    indices.length = 0; // Clear manually just in case

    const tData = TransformStore.data;
    const pData = PhysicsStore.data;
    const sFlags = StateStore.flags; // <-- QUAN TRỌNG

    // 1. Query Indices
    let px = entity.position.x;
    let py = entity.position.y;

    // Ưu tiên đọc từ DOD nếu có
    if (entity.physicsIndex !== undefined) {
      const tIdx = entity.physicsIndex * 8;
      px = tData[tIdx];
      py = tData[tIdx + 1];
    }
    rawGrid.queryRadiusInto(px, py, 300, indices);

    const count = indices.length;
    for (let i = 0; i < count; i++) {
      const idx = indices[i];
      if (idx === entity.physicsIndex) continue;

      // EIDOLON-V: BITMASK CHECK (Siêu nhanh)
      const flag = sFlags[idx];

      // Bỏ qua nếu không Active hoặc đã Chết
      if ((flag & EntityFlags.ACTIVE) === 0) continue;
      if ((flag & EntityFlags.DEAD) !== 0) continue;

      // 2. DOD Distance Check
      const tIdx = idx * 8;
      const pIdx = idx * 8;

      const ox = tData[tIdx];
      const oy = tData[tIdx + 1];
      const or = pData[pIdx + 4]; // radius

      const dx = px - ox;
      const dy = py - oy;
      const distSq = dx * dx + dy * dy;

      const minDist = entity.radius + or;

      if (distSq < minDist * minDist) {
        // 3. Resolve Logic (Chỉ lookup Object khi thực sự va chạm)

        // Case A: FOOD Collision
        if ((flag & EntityFlags.FOOD) !== 0) {
          // EIDOLON-V: Use DOD Consume
          if (entity.physicsIndex !== undefined) {
            consumePickupDOD(entity.physicsIndex, idx, state);
          }
          continue;
        }

        // Case B: UNIT Collision (Player/Bot)
        if ((flag & (EntityFlags.PLAYER | EntityFlags.BOT)) !== 0) {
          const target = EntityLookup[idx];
          if (target) resolveCombat(entity, target as Player | Bot, dt, state, true, true);
        }
      }
    }
  }



  private updateProjectiles(state: GameState, dt: number): void {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const projectile = state.projectiles[i];

      // Update projectile position
      // DISABLED: Projectiles are managed by PhysicsSystem now (Phase 6)
      // projectile.position.x += projectile.velocity.x * dt;
      // projectile.position.y += projectile.velocity.y * dt;

      // Apply projectile effect on collision
      const hit = this.checkProjectileCollision(projectile, state);
      if (hit) {
        applyProjectileEffect(projectile, hit as Player | Bot, state);
        state.projectiles.splice(i, 1);
      }

      // Remove if out of bounds
      const distFromCenter = Math.sqrt(
        projectile.position.x * projectile.position.x +
        projectile.position.y * projectile.position.y
      );
      if (distFromCenter > 3000) { // MAP_RADIUS
        state.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileCollision(projectile: Entity, state: GameState): Entity | null {
    const rawGrid = (this.spatialGrid as any).grid;
    if (!rawGrid) return null;

    // EIDOLON-V: Use Shared Buffer
    const indices = this._queryBuffer;
    indices.length = 0;

    const tData = TransformStore.data;
    const pData = PhysicsStore.data;

    // Query nearby
    let px = projectile.position.x;
    let py = projectile.position.y;

    // EIDOLON-V: Read from DOD Store
    if (projectile.physicsIndex !== undefined) {
      const tIdx = projectile.physicsIndex * 8;
      px = TransformStore.data[tIdx];
      py = TransformStore.data[tIdx + 1];
    }

    rawGrid.queryRadiusInto(px, py, 50, indices); // 50 seems safe margin

    const count = indices.length;
    for (let i = 0; i < count; i++) {
      const idx = indices[i];

      // Skip self (if projectile was in grid? usually it is)
      if (idx === projectile.physicsIndex) continue;

      // DOD Distance Check
      const tIdx = idx * 8;
      const pIdx = idx * 8;

      const ox = tData[tIdx];
      const oy = tData[tIdx + 1];
      const or = pData[pIdx + 4];

      const dx = ox - projectile.position.x;
      const dy = oy - projectile.position.y;
      const distSq = dx * dx + dy * dy;
      const collisionDist = or + projectile.radius;

      if (distSq < collisionDist * collisionDist) {
        // EIDOLON-V: DOD Owner Check (Integer)
        if (projectile.physicsIndex !== undefined) {
          const projIdx = projectile.physicsIndex * 4; // ProjectileStore.STRIDE
          const ownerId = ProjectileStore.data[projIdx];
          if (ownerId === idx) continue; // Owner ignores their own bullet
        } else {
          // Fallback if no physics index (legacy support)
          const entity = EntityLookup[idx];
          if (!entity) continue;
          if ((projectile as any).ownerId && entity.id === (projectile as any).ownerId) continue;
        }

        const entity = EntityLookup[idx];
        if (!entity) continue;

        return entity;
      }
    }

    return null;
  }



  private cleanupTransientEntities(state: GameState): void {
    const grid = this.spatialGrid;

    // Remove dead food
    if (state.food.length > 0) {
      filterInPlace(state.food, f => {
        if (f.isDead) {
          grid.removeStatic(f);
          pooledEntityFactory.createPooledFood().release(f);
          return false;
        }
        return true;
      });
    }

    // Remove dead projectiles
    if (state.projectiles.length > 0) {
      filterInPlace(state.projectiles, p => {
        if (p.isDead) {
          pooledEntityFactory.createPooledProjectile().release(p);
          return false;
        }
        return true;
      });
    }

    // Remove dead entities
    filterInPlace(state.bots, b => {
      if (b.isDead) {
        // EIDOLON-V FIX: Cleanup events/synergies to prevent ID reuse bugs
        const { TattooEventManager } = require('../cjr/tattooEvents');
        TattooEventManager.triggerDeactivate(b.id);
        return false;
      }
      return true;
    });
    filterInPlace(state.particles, p => p.life > 0);
    filterInPlace(state.delayedActions, a => a.timer > 0);
  }

  private updateCamera(state: GameState): void {
    if (state.player) {
      // EIDOLON-V: Read from DOD Store
      let px = state.player.position.x;
      let py = state.player.position.y;

      if (state.player.physicsIndex !== undefined) {
        const tIdx = state.player.physicsIndex * 8;
        px = TransformStore.data[tIdx];
        py = TransformStore.data[tIdx + 1];
      }

      // Smooth camera follow
      const smoothing = 0.1;
      state.camera.x += (px - state.camera.x) * smoothing;
      state.camera.y += (py - state.camera.y) * smoothing;
    }
  }

  private checkTattooUnlock(state: GameState): void {
    if (state.tattooChoices) return;

    const player = state.player;
    if (player.matchPercent >= 0.8 && (player as any).level >= 2) {
      state.tattooChoices = getTattooChoices(3);
    }
  }

  // EIDOLON-V FIX: Main optimized update method
  public updateGameState(state: GameState, dt: number): GameState {
    // EIDOLON-V FIX: Bind engine and spatial grid at update time
    bindEngine(state.engine);
    this.spatialGrid = getCurrentSpatialGrid();

    if (state.isPaused) return state;

    this.frameCount++;

    // Collect entities once
    const batch = this.collectEntities(state);

    // Batch updates
    this.integratePhysics(batch, dt);

    state.gameTime += dt;
    if (state.gameTime > state.levelConfig.timeLimit && !state.result) {
      state.result = 'lose';
      state.isPaused = true;
    }

    this.updateSpatialGrid(batch);
    this.updateLogic(state, dt);

    // System updates
    updateWaveSpawner(state, dt);
    this.updateCJRSystems(batch, state, dt);
    updateBossLogic(state, dt);
    updateDynamicBounty(state, dt);
    updateWinCondition(state, dt, state.levelConfig);

    this.checkTattooUnlock(state);
    vfxIntegrationManager.update(state, dt);
    tattooSynergyManager.updateSynergies(state, dt);

    this.updateCamera(state);

    // EIDOLON-V: System Updates (DOD)
    SkillSystem.update(dt);
    TattooSystem.update(dt);

    const shakeOffset = vfxIntegrationManager.getScreenShakeOffset();
    state.camera.x += shakeOffset.x;
    state.camera.y += shakeOffset.y;

    // Return arrays to pool
    this.returnArrays(batch);

    return state;
  }

  public updateClientVisuals(state: GameState, dt: number): void {
    // EIDOLON-V FIX: Bind engine and spatial grid at update time
    bindEngine(state.engine);
    this.spatialGrid = getCurrentSpatialGrid();

    // EIDOLON-V: Pull Sync from DOD for Rendering (Phase 6)
    // Disabled in integratePhysics, so we sync here for the View.
    this.syncBatchFromDOD(state.players);
    this.syncBatchFromDOD(state.bots);
    this.syncBatchFromDOD(state.projectiles);

    vfxIntegrationManager.update(state, dt);
    this.updateCamera(state);

    const visualShakeOffset = vfxIntegrationManager.getScreenShakeOffset();
    state.camera.x += visualShakeOffset.x;
    state.camera.y += visualShakeOffset.y;
  }

  // EIDOLON-V FIX: Performance monitoring
  public getPerformanceStats(): {
    frameCount: number;
    poolSize: number;
    memoryUsage: number;
  } {
    return {
      frameCount: this.frameCount,
      poolSize: 5, // Static batch arrays
      memoryUsage: 0 // TODO: Implement memory monitoring
    };
  }
}

// EIDOLON-V FIX: Export singleton optimized engine
export const optimizedEngine = OptimizedGameEngine.getInstance();
