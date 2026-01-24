
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
import { updateGameState } from '../../../services/engine/index';
import { createServerGameState } from './serverGameState';

export class GameRoom extends Room<GameRoomState> {
  maxClients = 50;
  private gameLoop!: Delayed;

  onCreate(options: any) {
    console.log('GameRoom created!', options);
    this.setState(new GameRoomState());

    // Initialize World
    this.state.worldWidth = WORLD_WIDTH;
    this.state.worldHeight = WORLD_HEIGHT;

    // Start Game Loop (20 FPS or 60 FPS)
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 20);

    // Initial Spawn
    this.spawnFoodInitial();
  }

  onJoin(client: Client, options: { name?: string; shape?: string; pigment?: any }) {
    console.log(client.sessionId, 'joined!', options);

    const player = new PlayerState();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.name = options.name || `Jelly ${client.sessionId.substr(0, 4)}`;
    player.shape = options.shape || 'circle';

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
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('room disposed!');
  }

  update(dt: number) {
    this.state.gameTime += dt;

    // Convert server state to game engine format
    const gameState = createServerGameState(this.state);
    
    // Run authoritative physics simulation
    const updatedState = updateGameState(gameState, dt);
    
    // Sync results back to server state
    this.syncGameStateToServer(updatedState);
  }

  spawnFoodInitial() {
    for (let i = 0; i < 200; i++) { // Reduced for initial load
      const food = new FoodState();
      food.id = Math.random().toString(36).substr(2, 9);

      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * MAP_RADIUS;
      food.x = Math.cos(angle) * r;
      food.y = Math.sin(angle) * r;

      food.kind = 'pigment';
      food.pigment.r = Math.random();
      food.pigment.g = Math.random();
      food.pigment.b = Math.random();

      this.state.food.set(food.id, food);
    }
  }

  private syncGameStateToServer(gameState: any) {
    // Sync player positions and states
    gameState.players?.forEach((player: any) => {
      const serverPlayer = this.state.players.get(player.id);
      if (serverPlayer) {
        serverPlayer.position.x = player.position.x;
        serverPlayer.position.y = player.position.y;
        serverPlayer.radius = player.radius;
        serverPlayer.score = player.score;
        serverPlayer.currentHealth = player.currentHealth;
        // Sync other essential properties
      }
    });

    // Sync food states
    gameState.food?.forEach((food: any) => {
      if (food.isDead) {
        this.state.food.delete(food.id);
      } else {
        const serverFood = this.state.food.get(food.id);
        if (!serverFood) {
          // Spawn new food if needed
          const newFood = new FoodState();
          newFood.id = food.id;
          newFood.x = food.position.x;
          newFood.y = food.position.y;
          newFood.kind = food.kind;
          newFood.pigment = food.pigment;
          this.state.food.set(food.id, newFood);
        }
      }
    });

    // Handle dead entities cleanup
    this.state.players.forEach((player, sessionId) => {
      const gamePlayer = gameState.players?.find((p: any) => p.id === sessionId);
      if (gamePlayer?.isDead) {
        // Handle player death (respawn logic etc.)
        this.handlePlayerDeath(player, sessionId);
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
