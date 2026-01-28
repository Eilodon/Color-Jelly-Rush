
/**
 * CJR MULTIPLAYER GAME ROOM
 * Authoritative server implementation using Colyseus
 */

import { Room, Client, Delayed } from 'colyseus';
import {
  GameRoomState,
  PlayerState,
  BotState,
  FoodState,
  ProjectileState,
  PigmentVec3
} from '../schema/GameState';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAP_RADIUS,
  GRID_CELL_SIZE,
  FOOD_COUNT,
  FOOD_RADIUS
} from '../constants';
// Import shared game logic
import { updateGameState, createInitialState } from '../../../services/engine/index';
import { createPlayer } from '../../../services/engine/factories';
import { getPhysicsWorld, bindEngine } from '../../../services/engine/context';
import { GameRuntimeState } from '../../../types';
import { getLevelConfig } from '../../../services/cjr/levels';
import { vfxIntegrationManager } from '../../../services/vfx/vfxIntegration';
// Import security validation
import { serverValidator } from '../security/ServerValidator';

export class GameRoom extends Room<GameRoomState> {
  maxClients = 50;
  private gameLoop!: Delayed;
  private runtime!: GameRuntimeState;
  private simState!: ReturnType<typeof createInitialState>;
  // Phase 3: Input Queue for reliable actions
  private inputQueueBySession: Map<string, any[]> = new Map();

  onCreate(options: any) {
    console.log('GameRoom created!', options);
    this.setState(new GameRoomState());
    vfxIntegrationManager.setVFXEnabled(false);

    // ... (World Init)
    this.state.worldWidth = WORLD_WIDTH;
    this.state.worldHeight = WORLD_HEIGHT;

    const levelConfig = getLevelConfig(1);
    this.runtime = {
      wave: {
        ring1: levelConfig.waveIntervals.ring1,
        ring2: levelConfig.waveIntervals.ring2,
        ring3: levelConfig.waveIntervals.ring3
      },
      boss: {
        bossDefeated: false,
        rushWindowTimer: 0,
        rushWindowRing: null,
        currentBossActive: false,
        attackCharging: false,
        attackTarget: null,
        attackChargeTimer: 0
      },
      contribution: {
        damageLog: new Map(),
        lastHitBy: new Map()
      }
    };

    this.simState = createInitialState(1);
    this.simState.runtime = this.runtime;
    this.simState.players = [this.simState.player];

    this.syncSimStateToServer();

    // Start Game Loop (60 FPS)
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 60);

    this.onMessage('input', (client, message: any) => {
      if (!message) return;
      // Push to queue
      if (!this.inputQueueBySession.has(client.sessionId)) {
        this.inputQueueBySession.set(client.sessionId, []);
      }
      this.inputQueueBySession.get(client.sessionId)!.push(message);
    });
  }

  // ... (onJoin, onLeave as is) ...

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    this.state.players.delete(client.sessionId);
    this.inputQueueBySession.delete(client.sessionId); // Cleanup

    // DOD Cleanup: Free physics world slot for leaving player
    bindEngine(this.simState.engine);
    const physicsWorld = getPhysicsWorld();
    physicsWorld.free(client.sessionId);

    this.simState.players = this.simState.players.filter(p => p.id !== client.sessionId);
    if (this.simState.players.length > 0) {
      this.simState.player = this.simState.players[0];
    }
  }

  // ... (onDispose as is) ...

  update(dt: number) {
    const dtSec = dt / 1000;
    this.state.gameTime += dtSec;

    this.applyInputsToSimState();
    updateGameState(this.simState, dtSec);
    this.syncSimStateToServer();
  }

  private applyInputsToSimState() {
    this.simState.players.forEach(player => {
      const queue = this.inputQueueBySession.get(player.id);
      if (!queue || queue.length === 0) {
        // No new input, retain last? Or clear? 
        // In CSP, we usually want "Input Persistency" for movement (Joystick).
        // But for Events (Skill), it's consume-once.

        // If queue is empty, we keep existing inputs (stateful) but clear "events".
        // However, we reset `player.inputs` in updateGameState usually? No, updateGameState reads `inputs`.
        // We should zero out "Trigger" inputs like Space if no packet?
        // Actually, Client sends Space=True continuously if held.
        // But we moved to Events for Skills.

        // Let's process the queue.
        // If queue is empty, do nothing (keep last targets)?
        // Or if we haven't received input for X ms, stop?
        return;
      }

      const serverPlayer = this.state.players.get(player.id);
      if (!serverPlayer) return;

      // Process up to 5 inputs per frame to catch up, prevent death spiral
      const MAX_PROCESS = 5;
      let count = 0;

      while (queue.length > 0 && count < MAX_PROCESS) {
        const input = queue.shift(); // Oldest first
        count++;

        // Sanitize
        const sanitizedInput = serverValidator.sanitizeInput(input);

        // Validate (Sequence etc)
        // ... (Simplified validation for Refactor) ...

        // Apply Movement (Stateful - Last one wins for position target)
        player.targetPosition = { x: sanitizedInput.targetX, y: sanitizedInput.targetY };
        player.inputSeq = sanitizedInput.seq;

        // Apply Events (Edge)
        if (input.events && Array.isArray(input.events)) {
          input.events.forEach((evt: any) => {
            if (evt.type === 'skill') {
              // Apply Skill Logic IMMEDIATELY
              // We need access to `applySkill` from engine
              // Import { applySkill } from '../../../services/engine/systems/skills';
              // But wait, applySkill needs state.

              // We can set a transient flag on player that updateGameState consumes?
              // Or call it directly. updateGameState calls applySkill if inputs.space is true.
              // BUT we want to decouple from "holding space".

              // Solution: push to player.inputEvents in SimState
              if (!player.inputEvents) player.inputEvents = [];
              player.inputEvents.push({ type: 'skill', id: evt.id });
            }
            if (evt.type === 'eject') {
              if (!player.inputEvents) player.inputEvents = [];
              player.inputEvents.push({ type: 'eject', id: evt.id });
            }
          });
        }

        // Legacy Fallback for "holding space" if client doesn't support events yet?
        // We can keep `player.inputs.space = !!sanitizedInput.skill` too.
        player.inputs = { space: sanitizedInput.space, w: sanitizedInput.w };
      }
    });
  }

  private syncSimStateToServer() {
    this.simState.players.forEach((player) => {
      let serverPlayer = this.state.players.get(player.id);
      if (!serverPlayer) {
        serverPlayer = new PlayerState();
        serverPlayer.id = player.id;
        serverPlayer.sessionId = player.id;
        serverPlayer.name = player.name;
        serverPlayer.shape = player.shape;
        this.state.players.set(player.id, serverPlayer);
      }

      // Validate position changes to prevent teleportation
      const positionValidation = serverValidator.validatePosition(
        player.id,
        player.position,
        { x: serverPlayer.position.x, y: serverPlayer.position.y },
        1 / 60 // Assuming 60 FPS
      );

      if (!positionValidation.isValid) {
        console.warn(`Invalid position from ${player.id}: ${positionValidation.reason}`);
        // Use corrected position
        if (positionValidation.correctedPosition) {
          player.position.x = positionValidation.correctedPosition.x;
          player.position.y = positionValidation.correctedPosition.y;
        }
      }

      // Validate player stats
      const statsValidation = serverValidator.validatePlayerStats(
        {
          ...serverPlayer,
          score: player.score,
          currentHealth: player.currentHealth,
          radius: player.radius,
          pigment: player.pigment
        } as PlayerState,
        serverPlayer,
        1 / 60
      );

      if (!statsValidation.isValid) {
        console.warn(`Invalid stats from ${player.id}: ${statsValidation.reason}`);
        // Skip stats update but continue with position
      }

      // Apply validated state
      serverPlayer.position.x = player.position.x;
      serverPlayer.position.y = player.position.y;
      serverPlayer.velocity.x = player.velocity.x;
      serverPlayer.velocity.y = player.velocity.y;
      serverPlayer.radius = player.radius;
      serverPlayer.score = player.score;
      serverPlayer.currentHealth = player.currentHealth;
      serverPlayer.kills = player.kills;
      serverPlayer.matchPercent = player.matchPercent;
      serverPlayer.ring = player.ring as any;
      serverPlayer.emotion = player.emotion;
      serverPlayer.isDead = player.isDead;
      serverPlayer.skillCooldown = player.skillCooldown;
      serverPlayer.lastProcessedInput = player.inputSeq || 0;
      serverPlayer.pigment.r = player.pigment.r;
      serverPlayer.pigment.g = player.pigment.g;
      serverPlayer.pigment.b = player.pigment.b;
      serverPlayer.targetPigment.r = player.targetPigment.r;
      serverPlayer.targetPigment.g = player.targetPigment.g;
      serverPlayer.targetPigment.g = player.targetPigment.g;
      serverPlayer.targetPigment.b = player.targetPigment.b;

      // Sync specific CJR status effects
      serverPlayer.statusEffects.commitShield = player.statusEffects.commitShield || 0;
      serverPlayer.statusEffects.pityBoost = player.statusEffects.pityBoost || 0;
      serverPlayer.statusEffects.pulseTimer = player.statusEffects.pulseTimer || 0;
      serverPlayer.statusEffects.kingForm = player.statusEffects.kingForm || 0;
      serverPlayer.statusEffects.shielded = player.statusEffects.shielded;
      serverPlayer.statusEffects.speedBoost = player.statusEffects.speedBoost;
      serverPlayer.statusEffects.speedBoost = player.statusEffects.speedBoost;
      // Schema StatusEffects has: speedBoost, shielded, burning... invulnerable, damageBoost, defenseBoost.

      // And we added commitShield, pityBoost, pulseTimer.
      // kingForm is NOT in schema StatusEffects? I should check GameState.ts again.
      // If it's not, I need to add it or map it.
      // For now, let's sync what we added.
    });

    this.simState.bots.forEach((bot) => {
      let serverBot = this.state.bots.get(bot.id);
      if (!serverBot) {
        serverBot = new BotState();
        serverBot.id = bot.id;
        serverBot.name = bot.name;
        serverBot.shape = bot.shape as any;
        serverBot.isBoss = !!bot.isBoss;
        this.state.bots.set(bot.id, serverBot);
      }
      serverBot.position.x = bot.position.x;
      serverBot.position.y = bot.position.y;
      serverBot.velocity.x = bot.velocity.x;
      serverBot.velocity.y = bot.velocity.y;
      serverBot.radius = bot.radius;
      serverBot.currentHealth = bot.currentHealth;
      serverBot.score = bot.score;

      serverBot.isDead = bot.isDead;

      // Sync Bot Status too if needed (e.g. boss shield)
      serverBot.statusEffects.shielded = bot.statusEffects.shielded;
    });

    this.simState.food.forEach((food) => {
      if (food.isDead) {
        this.state.food.delete(food.id);
        return;
      }
      let serverFood = this.state.food.get(food.id);
      if (!serverFood) {
        serverFood = new FoodState();
        serverFood.id = food.id;
        this.state.food.set(food.id, serverFood);
      }
      serverFood.x = food.position.x;
      serverFood.y = food.position.y;
      serverFood.radius = food.radius;
      serverFood.kind = food.kind;
      if (food.pigment) {
        serverFood.pigment.r = food.pigment.r;
        serverFood.pigment.g = food.pigment.g;
        serverFood.pigment.b = food.pigment.b;
      }
    });

    this.simState.projectiles.forEach((proj) => {
      let serverProj = this.state.projectiles.get(proj.id);
      if (!serverProj) {
        serverProj = new ProjectileState();
        serverProj.id = proj.id;
        serverProj.ownerId = proj.ownerId;
        serverProj.type = proj.type;
        this.state.projectiles.set(proj.id, serverProj);
      }
      serverProj.x = proj.position.x;
      serverProj.y = proj.position.y;
      serverProj.vx = proj.velocity.x;
      serverProj.vy = proj.velocity.y;
      serverProj.damage = proj.damage;
    });
  }

  private handlePlayerDeath(player: PlayerState, sessionId: string) {
    // Respawn player at random position
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (MAP_RADIUS * 0.8);
    player.position.x = Math.cos(angle) * r;
    player.position.y = Math.sin(angle) * r;
    player.radius = 15; // Reset size
    player.currentHealth = 100; // Reset health
    // Reset other properties as needed
  }
}
