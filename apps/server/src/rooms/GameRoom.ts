/**
 * CJR MULTIPLAYER GAME ROOM
 * Authoritative server implementation using Colyseus
 */

import colyseus from 'colyseus';
const { Room } = colyseus;
import type { Client, Delayed } from 'colyseus';
import { logger } from '../logging/Logger';
import {
  GameRoomState,
  PlayerState,
  BotState,
  FoodState,
  ProjectileState,
  PigmentVec3,
  VFXEventState,
} from '../schema/GameState';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAP_RADIUS,
  GRID_CELL_SIZE,
  FOOD_COUNT,
  FOOD_RADIUS,
} from '../constants';
// Import shared game logic
// EIDOLON-V PHASE3: Use @cjr/engine only (headless)
import { BinaryPacker } from '@cjr/engine/networking';
import type { NetworkInput } from '@cjr/engine/networking';
import { createPlayerData } from '@cjr/engine/factories';
import { getLevelConfig } from '@cjr/engine/config';

// Server-side types (not from client)
interface ServerPlayerData {
  id: string;
  name: string;
  shape: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  score: number;
  health: number;
  _lastProcessedSeq?: number;
}
// Import security validation
import { serverValidator } from '../security/ServerValidator';
// EIDOLON-V PHASE1: Import enhanced input validation
import { InputValidator } from '../validation/InputValidator';

// Server Engine Bridge
import { ServerEngineBridge } from '../engine/ServerEngineBridge';

export class GameRoom extends Room<GameRoomState> {
  maxClients = 50;
  private gameLoop!: Delayed;
  private serverEngine!: ServerEngineBridge;
  private inputsBySession: Map<
    string,
    { seq: number; targetX: number; targetY: number; space: boolean; w: boolean }
  > = new Map();

  private static readonly SECURITY_MAX_DT_SEC = 0.2;
  private lastUpdateDtSec = 1 / 60;

  // EIDOLON-V PHASE1: WebSocket Rate Limiting
  private clientRates: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT_WINDOW = 1000;
  private readonly RATE_LIMIT_MAX = 60;

  onCreate(options: unknown) {
    logger.info('GameRoom created!', { options });

    // EIDOLON-V PHASE1: Validate room creation options
    const roomValidation = InputValidator.validateRoomOptions(options);
    if (!roomValidation.isValid) {
      logger.warn(`Invalid room options: ${roomValidation.errors.join(', ')}`);
      throw new Error(`Invalid room options: ${roomValidation.errors.join(', ')}`);
    }

    this.setState(new GameRoomState());

    this.serverEngine = new ServerEngineBridge();

    this.onMessage('input', (client, message: unknown) => {
      if (!message) return;

      // EIDOLON-V PHASE1: Rate Limit Check
      const now = Date.now();
      let rate = this.clientRates.get(client.sessionId);
      if (!rate || now > rate.resetTime) {
        rate = { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW };
        this.clientRates.set(client.sessionId, rate);
      }
      rate.count++;

      if (rate.count > this.RATE_LIMIT_MAX) {
        // Log sparingly (every 20 dropped frames) to avoid polluting logs
        if (rate.count % 20 === 0) {
          logger.warn(`Rate limit exceeded for ${client.sessionId}`, { count: rate.count });
        }
        return;
      }

      // EIDOLON-V PHASE1: Validate input before processing
      const inputValidation = InputValidator.validateGameInput(message);
      if (!inputValidation.isValid) {
        logger.warn(`Invalid input from ${client.sessionId}`, { errors: inputValidation.errors });
        return; // Silently drop invalid input
      }

      const sanitizedInput = inputValidation.sanitized || (message as any); // Fallback if sanitary fails but valid? No, if valid, sanitized is set.

      this.inputsBySession.set(client.sessionId, {
        seq: sanitizedInput?.seq || 0,
        targetX: sanitizedInput?.targetX ?? 0,
        targetY: sanitizedInput?.targetY ?? 0,
        space: !!sanitizedInput?.space,
        w: !!sanitizedInput?.w,
      });
    });
  }

  onJoin(client: Client, options: { name?: string; shape?: string; pigment?: any }) {
    // Note: options here is typed by Colyseus usually as any, but we can enforce.
    // Actually onJoin(client: Client, options?: any) is standard.
    // We will cast options inside.
    logger.info('Client joined', { sessionId: client.sessionId, options });

    // EIDOLON-V PHASE1: Validate player options
    const playerValidation = InputValidator.validatePlayerOptions(options);
    let validOptions: any = {}; // Use explicit any for internal logic if needed or properly typed.

    if (!playerValidation.isValid) {
      logger.warn(`Invalid player options from ${client.sessionId}`, {
        errors: playerValidation.errors,
      });
      // Don't disconnect, just use defaults
      validOptions = {};
    } else {
      validOptions = playerValidation.sanitized || {};
    }

    const player = new PlayerState();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.name = validOptions.name || `Jelly ${client.sessionId.substr(0, 4)}`;
    player.shape = validOptions.shape || 'circle';

    // Random Position
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (MAP_RADIUS * 0.8);
    player.position.x = Math.cos(angle) * r;
    player.position.y = Math.sin(angle) * r;

    // Use provided pigment or random
    if (options.pigment) {
      player.pigment.r = options.pigment.r || Math.random();
      player.pigment.g = options.pigment.g || Math.random();
      player.pigment.b = options.pigment.b || Math.random();
    } else {
      player.pigment.r = Math.random();
      player.pigment.g = Math.random();
      player.pigment.b = Math.random();
    }

    // Target Pigment (Quest)
    player.targetPigment.r = Math.random();
    player.targetPigment.g = Math.random();
    player.targetPigment.b = Math.random();

    this.state.players.set(client.sessionId, player);

    // Add player to server engine
    const dodIndex = this.serverEngine.addPlayer(client.sessionId, player.name, player.shape);
    logger.info('Player added to engine', { sessionId: client.sessionId, dodIndex });
  }

  // Initializer helper to ensure fields exist if createPlayer doesn't set them (it's in factory, wait, I need to check factory)
  // Actually, I should update the factory or just init here if it's missing.
  // But wait, createPlayer is in services/engine/factories.ts, I should check that file too.
  // For now, I'll rely on the class property initializer if possible or update factory.
  // Checking factories.ts is safer. I'll do that in next step.

  onLeave(client: Client, consented: boolean) {
    logger.info('Client left', { sessionId: client.sessionId, consented });

    // EIDOLON-V PHASE1: Cleanup Rate Limiter
    this.clientRates.delete(client.sessionId);

    // EIDOLON-V FIX: Clean up PhysicsWorld slot
    this.serverEngine.removePlayer(client.sessionId);

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    logger.info('Room disposed');
    // Clean up security validator
    serverValidator.cleanup();
  }

  update(dt: number) {
    const dtSec = dt / 1000;
    this.lastUpdateDtSec = dtSec;
    this.state.gameTime += dtSec;

    // TODO: Implement server tick with ServerEngineBridge
    // For now, this is a placeholder that broadcasts player positions from schema
    this.broadcastBinaryTransforms();
  }

  private broadcastBinaryTransforms() {
    // Gather dynamic entities from server state (not simState)
    const updates: { id: string; x: number; y: number; vx: number; vy: number }[] = [];

    // Iterate Colyseus schema state directly
    this.state.players.forEach((player, sessionId) => {
      updates.push({
        id: sessionId,
        x: player.position.x,
        y: player.position.y,
        vx: player.velocity.x,
        vy: player.velocity.y,
      });
    });

    this.state.bots.forEach((bot, id) => {
      updates.push({
        id,
        x: bot.position.x,
        y: bot.position.y,
        vx: bot.velocity.x,
        vy: bot.velocity.y,
      });
    });

    if (updates.length > 0) {
      const buffer = BinaryPacker.packTransforms(updates, this.state.gameTime);
      // Broadcast as "bin" message or raw
      this.broadcast('bin', new Uint8Array(buffer));
    }
  }

  private applyInputsToSimState() {
    // TODO: Apply inputs using ServerEngineBridge
    // For now, just read from inputsBySession and update schema state directly
    this.state.players.forEach((player, sessionId) => {
      const input = this.inputsBySession.get(sessionId);
      if (!input) return;

      // Apply simple movement based on target position
      const dx = input.targetX - player.position.x;
      const dy = input.targetY - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 1) {
        const speed = 200 * this.lastUpdateDtSec; // 200 units per second
        const moveX = (dx / dist) * Math.min(speed, dist);
        const moveY = (dy / dist) * Math.min(speed, dist);
        
        player.position.x += moveX;
        player.position.y += moveY;
        player.velocity.x = moveX / this.lastUpdateDtSec;
        player.velocity.y = moveY / this.lastUpdateDtSec;
      }
    });
  }

  private syncSimStateToServer() {
    // TODO: Sync from ServerEngineBridge to Colyseus schema
    // For now, schema is authoritative
    this.state.players.forEach((player) => {
      const input = this.inputsBySession.get(player.sessionId);
      if (input) {
        player.lastProcessedInput = input.seq;
      }
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
