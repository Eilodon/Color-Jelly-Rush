// EIDOLON-V FIX: Optimized Game Engine with Batch Processing
// Eliminates O(n²) complexity and reduces function call overhead

import { GameState, Player, Bot, Food, Entity, Projectile } from '../../types';
import { gameStateManager } from './GameStateManager';
import { bindEngine, getCurrentSpatialGrid, getCurrentEngine } from './context';
import { integrateEntity, checkCollisions, constrainToMap, updatePhysicsWorld } from './systems/physics';
import { updateAI } from './systems/ai';
import { applyProjectileEffect, resolveCombat, consumePickup } from './systems/combat';
import { applySkill } from './systems/skills';
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

import { pooledEntityFactory } from '../pooling/ObjectPool'; // EIDOLON-V FIX: Import pooling

// EIDOLON-V FIX: Batch processing system to reduce function call overhead
interface EntityBatch {
  players: Player[];
  bots: Bot[];
  projectiles: Entity[];
  food: Food[];
  all: Entity[];
}

// EIDOLON-V FIX: Object pool for entity arrays
class PersistentBatch {
  public players: Player[] = [];
  public bots: Bot[] = [];
  public projectiles: Entity[] = [];
  public food: Food[] = [];
  public all: Entity[] = [];

  clear(): void {
    this.players.length = 0;
    this.bots.length = 0;
    this.projectiles.length = 0;
    this.food.length = 0;
    this.all.length = 0;
  }
}

// EIDOLON-V FIX: Optimized game engine with batch processing
class OptimizedGameEngine {
  private static instance: OptimizedGameEngine;
  private spatialGrid: any;
  private batch: PersistentBatch;
  private frameCount: number = 0;

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

    const { players, bots, projectiles, food, all } = this.batch;

    // Fill arrays - ZERO ALLOCATION (Không dùng map/filter/concat)
    // 1. Players
    const sourcePlayers = state.players;
    for (let i = 0; i < sourcePlayers.length; i++) {
      players.push(sourcePlayers[i]);
      all.push(sourcePlayers[i]);
    }

    // 2. Bots
    const sourceBots = state.bots;
    for (let i = 0; i < sourceBots.length; i++) {
      bots.push(sourceBots[i]);
      all.push(sourceBots[i]);
    }

    // 3. Projectiles
    const sourceProj = state.projectiles;
    for (let i = 0; i < sourceProj.length; i++) {
      projectiles.push(sourceProj[i]);
      all.push(sourceProj[i]);
    }

    // 4. Food
    const sourceFood = state.food;
    for (let i = 0; i < sourceFood.length; i++) {
      food.push(sourceFood[i]);
      all.push(sourceFood[i]);
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
    // Chỉ sync những vật thể di chuyển (Players, Bots)
    // Food là static hoặc ít di chuyển, Projectile xử lý riêng
    world.syncBodiesFromBatch(batch.players);
    world.syncBodiesFromBatch(batch.bots);

    // BƯỚC 2: EXECUTE (Chạy mô phỏng vật lý SoA)
    // Hàm này sẽ cập nhật vị trí dựa trên vận tốc và xử lý va chạm chồng lấn (overlap)
    updatePhysicsWorld(world, dt);

    // BƯỚC 3: PULL (Sync từ Physics World -> Logic game)
    // Cập nhật lại vị trí hiển thị cho Player/Bot
    world.syncBodiesToBatch(batch.players);
    world.syncBodiesToBatch(batch.bots);

    // Lưu ý: Projectiles tự quản lý chuyển động trong updateProjectiles
  }

  // EIDOLON-V FIX: Optimized spatial grid updates
  private updateSpatialGrid(batch: EntityBatch): void {
    const grid = this.spatialGrid;

    // EIDOLON-V: Chỉ clear dynamic entities (Player, Bot, Projectile)
    // Food nằm ở layer tĩnh (layer 2), không clear mỗi frame trừ khi có thay đổi lớn
    grid.clearDynamic();

    // Re-insert dynamic entities
    // Chỉ insert những thứ CẦN va chạm
    const dynamicItems = batch.all;
    for (let i = 0; i < dynamicItems.length; i++) {
      const ent = dynamicItems[i];
      // Bỏ qua Food vì Food đã ở static layer (nếu code init đúng)
      // Nếu Food có di chuyển (magnet), ta cần xử lý riêng hoặc coi nó là dynamic
      if (!('value' in ent)) {
        grid.insert(ent);
      }
    }

    // Xử lý Food bị hút (Magnet) - chuyển thành dynamic tạm thời?
    // Hiện tại giữ đơn giản: Food tĩnh nằm yên.
  }

  // EIDOLON-V FIX: Batch logic updates
  private updateLogic(batch: EntityBatch, state: GameState, dt: number): void {
    // Update players
    for (let i = 0; i < batch.players.length; i++) {
      this.updatePlayer(batch.players[i], state, dt);
    }

    // Update bots
    for (let i = 0; i < batch.bots.length; i++) {
      this.updateBot(batch.bots[i], state, dt);
    }

    // Update projectiles
    this.updateProjectiles(state, dt);

    // Update visual effects
    this.updateFloatingTexts(state, dt);
    this.cleanupTransientEntities(state);
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

  private updatePlayer(player: Player, state: GameState, dt: number): void {
    if (player.isDead) return;

    // Input handled externally (by useGameSession or NetworkClient)

    // Optimized movement calculation
    const dx = player.targetPosition.x - player.position.x;
    const dy = player.targetPosition.y - player.position.y;
    const distSq = dx * dx + dy * dy;

    // Use squared distance to avoid sqrt operation
    if (distSq > 25) { // 5px deadzone squared
      const speed = player.maxSpeed * (player.statusEffects.speedBoost || 1);
      const dist = Math.sqrt(distSq);

      // Normalize and apply velocity
      player.velocity.x = (dx / dist) * speed;
      player.velocity.y = (dy / dist) * speed;
    } else {
      // Apply friction when close to target
      player.velocity.x *= 0.9;
      player.velocity.y *= 0.9;
    }

    // Apply skill
    if (player.inputs?.space) {
      applySkill(player, player.targetPosition, state);
    }

    // EIDOLON-V FIX: Ported Regen & Cooldown Logic
    if (player.currentHealth < player.maxHealth) {
      player.currentHealth += player.statusEffects.regen * dt;
    }
    player.lastEatTime += dt;
    player.lastHitTime += dt;

    if (player.skillCooldown > 0) {
      player.skillCooldown = Math.max(0, player.skillCooldown - dt * player.skillCooldownMultiplier);
    }

    if (player.streakTimer && player.streakTimer > 0) {
      player.streakTimer -= dt;
      if (player.streakTimer <= 0) {
        player.killStreak = 0;
        // createFloatingText(player.position, 'Streak Lost', '#ccc', 16, state); // Visual only, maybe skip in engine
      }
    }

    // EIDOLON-V FIX: Ported Magnet Logic
    this.updateMagnetLogic(player, state, dt);

    // EIDOLON-V FIX: Unit Collision (Combat)
    this.checkUnitCollisions(player, state, dt);
  }

  // EIDOLON-V FIX: Magnet Logic
  private updateMagnetLogic(player: Player, state: GameState, dt: number): void {
    const catalystSense = player.tattoos.includes(TattooId.CatalystSense);
    const magnetRadius = player.magneticFieldRadius || 0;

    if (magnetRadius > 0 || catalystSense) {
      const catalystRange = (player.statusEffects.catalystSenseRange || 2.0) * 130;
      const searchRadius = catalystSense ? Math.max(catalystRange, magnetRadius) : magnetRadius;
      const searchRadiusSq = searchRadius * searchRadius;
      const pullPower = 120 * dt;

      // Note: In optimized engine, we might want to use the spatial grid efficiently
      // But for now, parity first.
      const nearby = this.spatialGrid.getNearby(player, searchRadius);

      for (let i = 0; i < nearby.length; i++) {
        const entity = nearby[i];
        if (!('value' in entity)) continue; // Not food
        const f = entity as unknown as any;
        if (f.isDead) continue;

        if (catalystSense && f.kind !== 'catalyst' && magnetRadius <= 0) continue;

        const dx = player.position.x - f.position.x;
        const dy = player.position.y - f.position.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < searchRadiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const factor = pullPower / dist;
          f.velocity.x += dx * factor;
          f.velocity.y += dy * factor;
        }
      }
    }
  }

  // EIDOLON-V FIX: Unit Collision
  private checkUnitCollisions(entity: Player | Bot, state: GameState, dt: number): void {
    const nearby = this.spatialGrid.getNearby(entity, 300); // 300 range check
    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (other === entity) continue;
      if (entity.isDead || other.isDead) continue;

      // Food collision
      if ('value' in other) {
        const food = other as Food;
        const dx = entity.position.x - food.position.x;
        const dy = entity.position.y - food.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = entity.radius + food.radius;

        if (distSq < minDist * minDist) {
          consumePickup(entity, food, state);
        }
        continue;
      }

      // Combat Collision
      if ('score' in other) { // Is Unit
        resolveCombat(entity, other as Player | Bot, dt, state, true, true);
      }
    }
  }

  private updateBot(bot: Bot, state: GameState, dt: number): void {
    if (bot.isDead) return;

    // Bot AI update
    updateAI(bot, state, dt);

    // EIDOLON-V FIX: Bot Collisions (Combat & Food)
    this.checkUnitCollisions(bot, state, dt);
  }

  private updateProjectiles(state: GameState, dt: number): void {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const projectile = state.projectiles[i];

      // Update projectile position
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.y += projectile.velocity.y * dt;

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
    const nearby = this.spatialGrid.getNearby(projectile);

    for (let i = 0; i < nearby.length; i++) {
      const entity = nearby[i];
      if ((projectile as any).ownerId && entity.id === (projectile as any).ownerId) continue;

      const dx = entity.position.x - projectile.position.x;
      const dy = entity.position.y - projectile.position.y;
      const distSq = dx * dx + dy * dy;
      const collisionDist = entity.radius + projectile.radius;

      if (distSq < collisionDist * collisionDist) {
        return entity;
      }
    }

    return null;
  }

  private updateFloatingTexts(state: GameState, dt: number): void {
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const text = state.floatingTexts[i];

      text.position.x += text.velocity.x * dt;
      text.position.y += text.velocity.y * dt;
      text.life -= dt;

      if (text.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }
  }

  private cleanupTransientEntities(state: GameState): void {
    const grid = this.spatialGrid;

    // Remove dead food
    if (state.food.length > 0) {
      const deadFood: Food[] = [];
      const aliveFood: Food[] = [];

      // Single pass filter to avoid double iteration allocation overhead (though filter does alloc)
      // Ideally we swap-remove, but strict order isn't required for food.
      for (let i = 0; i < state.food.length; i++) {
        const f = state.food[i];
        if (f.isDead) {
          deadFood.push(f);
        } else {
          aliveFood.push(f);
        }
      }

      // Release to pool and grid
      for (let i = 0; i < deadFood.length; i++) {
        const food = deadFood[i];
        grid.removeStatic(food);
        pooledEntityFactory.createPooledFood().release(food);
      }

      state.food = aliveFood;
    }

    // Remove dead projectiles
    if (state.projectiles.length > 0) {
      const deadProj: any[] = []; // Type safety escape locally
      const aliveProj: Projectile[] = [];

      for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p.isDead) {
          deadProj.push(p);
        } else {
          aliveProj.push(p);
        }
      }

      for (let i = 0; i < deadProj.length; i++) {
        pooledEntityFactory.createPooledProjectile().release(deadProj[i]);
      }

      state.projectiles = aliveProj;
    }

    // Remove dead entities
    state.bots = state.bots.filter(b => !b.isDead);
    state.particles = state.particles.filter(p => p.life > 0);
    state.delayedActions = state.delayedActions.filter(a => a.timer > 0);
  }

  private updateCamera(state: GameState): void {
    if (state.player) {
      // Smooth camera follow
      const smoothing = 0.1;
      state.camera.x += (state.player.position.x - state.camera.x) * smoothing;
      state.camera.y += (state.player.position.y - state.camera.y) * smoothing;
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
    this.updateLogic(batch, state, dt);

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

    this.updateFloatingTexts(state, dt);
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
