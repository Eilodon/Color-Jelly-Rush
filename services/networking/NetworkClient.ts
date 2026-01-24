
import * as Colyseus from 'colyseus.js';
import type { Room } from 'colyseus.js';
import type { GameState, Player, Bot, Food, Projectile, Vector2 } from '../../types';
import type { PigmentVec3, ShapeId, Emotion, PickupKind, TattooId } from '../cjr/cjrTypes';

interface NetworkConfig {
  serverUrl: string;
  reconnectAttempts: number;
}

const DEFAULT_CONFIG: NetworkConfig = {
  serverUrl: 'ws://localhost:2567',
  reconnectAttempts: 5,
};

export type NetworkStatus = 'offline' | 'connecting' | 'online' | 'reconnecting' | 'error';

export class NetworkClient {
  private config: NetworkConfig;
  private room: Room | null = null;
  private client: Colyseus.Client;

  // Local GameState reference to sync into
  private localState: GameState | null = null;
  private inputSeq = 0;
  private pendingInputs: Array<{ seq: number; target: Vector2; inputs: { space: boolean; w: boolean } }> = [];
  private reconcileThreshold = 18;
  private statusListener?: (status: NetworkStatus) => void;
  private lastCredentials?: { name: string; shape: ShapeId };
  private isConnecting = false;
  private autoReconnect = true;

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new Colyseus.Client(this.config.serverUrl);
  }

  setLocalState(state: GameState) {
    this.localState = state;
  }

  setStatusListener(listener?: (status: NetworkStatus) => void) {
    this.statusListener = listener;
  }

  enableAutoReconnect(enabled: boolean) {
    this.autoReconnect = enabled;
  }

  private emitStatus(status: NetworkStatus) {
    if (this.statusListener) this.statusListener(status);
  }

  async connectWithRetry(playerName: string, shape: ShapeId): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;
    this.lastCredentials = { name: playerName, shape };
    this.emitStatus('connecting');

    for (let attempt = 0; attempt < this.config.reconnectAttempts; attempt++) {
      const ok = await this.connect(playerName, shape);
      if (ok) {
        this.emitStatus('online');
        this.isConnecting = false;
        return true;
      }
      this.emitStatus('reconnecting');
      await new Promise(resolve => setTimeout(resolve, 800 + attempt * 400));
    }

    this.emitStatus('error');
    this.isConnecting = false;
    return false;
  }

  async connect(playerName: string, shape: ShapeId): Promise<boolean> {
    try {
      this.room = await this.client.joinOrCreate('game', {
        name: playerName,
        shape: shape
      });
      console.log('Connected to CJR Server', this.room.sessionId);

      this.setupRoomListeners();
      return true;
    } catch (e) {
      console.error('Connection failed', e);
      return false;
    }
  }

  async disconnect() {
    if (this.room) {
      await this.room.leave();
      this.room = null;
    }
    this.emitStatus('offline');
  }

  private setupRoomListeners() {
    if (!this.room) return;

    this.room.onLeave(() => {
      if (this.autoReconnect && this.lastCredentials) {
        this.connectWithRetry(this.lastCredentials.name, this.lastCredentials.shape);
      } else {
        this.emitStatus('offline');
      }
    });

    this.room.onError(() => {
      if (this.autoReconnect && this.lastCredentials) {
        this.emitStatus('reconnecting');
        this.connectWithRetry(this.lastCredentials.name, this.lastCredentials.shape);
      } else {
        this.emitStatus('error');
      }
    });

    this.room.onStateChange((state: any) => {
      if (!this.localState) return;

      this.syncPlayers(state.players);

      // Sync Bots as array
      // We need to map MapSchema to our Array
      this.syncBots(state.bots); // Bots
      this.syncFood(state.food); // Food
    });
  }

  private syncPlayers(serverPlayers: any) {
    if (!this.localState || !this.room) return;

    const seenIds = new Set<string>();
    serverPlayers.forEach((sPlayer: any, sessionId: string) => {
      seenIds.add(sessionId);
      let localPlayer = this.localState!.players.find(p => p.id === sessionId);

      if (!localPlayer) {
        localPlayer = {
          id: sessionId,
          position: { x: sPlayer.position.x, y: sPlayer.position.y },
          velocity: { x: sPlayer.velocity.x, y: sPlayer.velocity.y },
          radius: sPlayer.radius,
          color: '#ffffff',
          isDead: sPlayer.isDead,
          trail: [],
          name: sPlayer.name,
          score: sPlayer.score,
          kills: sPlayer.kills,
          maxHealth: sPlayer.maxHealth,
          currentHealth: sPlayer.currentHealth,
          tier: 0 as any,
          targetPosition: { x: sPlayer.position.x, y: sPlayer.position.y },
          spawnTime: 0,
          pigment: { r: sPlayer.pigment.r, g: sPlayer.pigment.g, b: sPlayer.pigment.b },
          targetPigment: { r: sPlayer.targetPigment.r, g: sPlayer.targetPigment.g, b: sPlayer.targetPigment.b },
          matchPercent: sPlayer.matchPercent,
          ring: sPlayer.ring,
          emotion: sPlayer.emotion,
          shape: sPlayer.shape,
          tattoos: [...(sPlayer.tattoos ?? [])],
          lastHitTime: 0,
          lastEatTime: 0,
          matchStuckTime: 0,
          ring3LowMatchTime: 0,
          emotionTimer: 0,
          acceleration: 1,
          maxSpeed: 1,
          friction: 1,
          isInvulnerable: sPlayer.isInvulnerable,
          skillCooldown: sPlayer.skillCooldown,
          maxSkillCooldown: 5,
          defense: 1,
          damageMultiplier: 1,
          critChance: 0,
          critMultiplier: 1,
          lifesteal: 0,
          armorPen: 0,
          reflectDamage: 0,
          visionMultiplier: 1,
          sizePenaltyMultiplier: 1,
          skillCooldownMultiplier: 1,
          skillPowerMultiplier: 1,
          skillDashMultiplier: 1,
          killGrowthMultiplier: 1,
          poisonOnHit: false,
          doubleCast: false,
          reviveAvailable: false,
          magneticFieldRadius: 0,
          mutationCooldowns: {
            speedSurge: 0,
            invulnerable: 0,
            rewind: 0,
            lightning: 0,
            chaos: 0,
            kingForm: 0
          },
          rewindHistory: [],
          stationaryTime: 0,
          statusEffects: { ...sPlayer.statusEffects }
        } as unknown as Player;
        this.localState!.players.push(localPlayer);
      }

      localPlayer.score = sPlayer.score;
      localPlayer.currentHealth = sPlayer.currentHealth;
      localPlayer.kills = sPlayer.kills;
      localPlayer.matchPercent = sPlayer.matchPercent;
      localPlayer.ring = sPlayer.ring;
      localPlayer.emotion = sPlayer.emotion as Emotion;
      localPlayer.isDead = sPlayer.isDead;

      if (sessionId === this.room?.sessionId) {
        const dx = sPlayer.position.x - localPlayer.position.x;
        const dy = sPlayer.position.y - localPlayer.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.reconcileThreshold) {
          localPlayer.position.x = sPlayer.position.x;
          localPlayer.position.y = sPlayer.position.y;
          localPlayer.velocity.x = sPlayer.velocity.x;
          localPlayer.velocity.y = sPlayer.velocity.y;
        }
        const lastProcessed = sPlayer.lastProcessedInput || 0;
        this.pendingInputs = this.pendingInputs.filter(input => input.seq > lastProcessed);
        this.localState!.player = localPlayer;
      } else {
        localPlayer.position.x = sPlayer.position.x;
        localPlayer.position.y = sPlayer.position.y;
        localPlayer.velocity.x = sPlayer.velocity.x;
        localPlayer.velocity.y = sPlayer.velocity.y;
      }
    });

    this.localState.players = this.localState.players.filter(p => seenIds.has(p.id) || p.isDead);
  }

  private syncBots(serverBots: any) {
    if (!this.localState) return;

    const seenIds = new Set<string>();

    serverBots.forEach((sBot: any, id: string) => {
      seenIds.add(id);
      let localBot = this.localState!.bots.find(b => b.id === id);

      if (!localBot) {
        // Create new
        localBot = {
          id: sBot.id,
          position: { x: sBot.position.x, y: sBot.position.y },
          velocity: { x: sBot.velocity.x, y: sBot.velocity.y },
          radius: sBot.radius,
          color: '#fff', // Recalc from pigment later
          isDead: sBot.isDead,
          trail: [],
          name: sBot.name,
          score: sBot.score,
          kills: sBot.kills,
          maxHealth: sBot.maxHealth,
          currentHealth: sBot.currentHealth,
          // ... defaults
          pigment: { r: sBot.pigment.r, g: sBot.pigment.g, b: sBot.pigment.b },
          targetPigment: { r: sBot.targetPigment.r, g: sBot.targetPigment.g, b: sBot.targetPigment.b },
          matchPercent: sBot.matchPercent,
          ring: sBot.ring,
          emotion: sBot.emotion,
          shape: sBot.shape,
          statusEffects: { ...sBot.statusEffects }, // Simplified copy
          aiState: 'wander',
          personality: 'farmer',
          targetEntityId: null,
          aiReactionTimer: 0,
          tattoos: [],
          tier: 0 as any, // fixme
          isInvulnerable: false
          // fill rest with defaults
        } as unknown as Bot; // Force cast for MVP quick sync

        this.localState!.bots.push(localBot);
      }

      // Update properties
      localBot.position.x = sBot.position.x;
      localBot.position.y = sBot.position.y;
      localBot.velocity.x = sBot.velocity.x;
      localBot.velocity.y = sBot.velocity.y;
      localBot.currentHealth = sBot.currentHealth;
      localBot.isDead = sBot.isDead;
      localBot.pigment = sBot.pigment;
      localBot.emotion = sBot.emotion;
      // ... more props
    });

    // Remove stale
    this.localState.bots = this.localState.bots.filter(b => seenIds.has(b.id) || b.isDead); // Keep dead?
  }

  private syncFood(serverFood: any) {
    if (!this.localState) return;

    const seenIds = new Set<string>();

    serverFood.forEach((sFood: any, id: string) => {
      seenIds.add(id);
      let localFood = this.localState!.food.find(f => f.id === id);

      if (!localFood) {
        localFood = {
          id: sFood.id,
          position: { x: sFood.x, y: sFood.y },
          velocity: { x: 0, y: 0 },
          radius: sFood.radius,
          color: '#fff',
          isDead: sFood.isDead,
          trail: [],
          value: sFood.value,
          kind: sFood.kind as PickupKind,
          pigment: { r: sFood.pigment.r, g: sFood.pigment.g, b: sFood.pigment.b }
        };
        this.localState!.food.push(localFood);
      }

      if (sFood.isDead) localFood.isDead = true;
    });

    // Cleanup
    this.localState.food = this.localState.food.filter(f => seenIds.has(f.id));
  }


  sendInput(target: Vector2, inputs: { space: boolean; w: boolean }) {
    if (!this.room) return;
    const seq = ++this.inputSeq;
    this.pendingInputs.push({ seq, target: { ...target }, inputs: { ...inputs } });
    this.room.send('input', {
      seq,
      targetX: target.x,
      targetY: target.y,
      skill: inputs.space,
      eject: inputs.w
    });
  }

  getRoomId() { return this.room?.roomId; }
}

export const networkClient = new NetworkClient();
