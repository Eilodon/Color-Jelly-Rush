export enum Faction {
  Metal = 'Kim',
  Wood = 'Moc',
  Water = 'Thuy',
  Fire = 'Hoa',
  Earth = 'Tho',
}

export enum GamePhase {
  Menu = 'MENU',
  Playing = 'PLAYING',
  GameOver = 'GAME_OVER',
}

export enum SizeTier {
  Larva = 'Ấu Trùng',      // 0-20%
  Juvenile = 'Thiếu Niên', // 20-40%
  Adult = 'Thanh Niên',    // 40-60%
  Elder = 'Trung Niên',    // 60-80%
  AncientKing = 'Cổ Vương' // 80-100%
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number; // Represents Mass/Size
  color: string;
  isDead: boolean;
  trail: Vector2[]; // History of positions for rendering trails
}

export interface Projectile extends Entity {
  ownerId: string;
  damage: number;
  type: 'web' | 'ice' | 'sting'; // Skill types
  duration: number;
}

export interface LavaZone {
  id: string;
  position: Vector2;
  radius: number;
  damage: number;
  ownerId: string;
  life: number;
}

export interface DelayedAction {
  id: string;
  type: 'metal_dash' | 'water_shot' | 'fire_land';
  timer: number;
  ownerId: string;
  data?: any;
}

export interface Player extends Entity {
  faction: Faction;
  name: string;
  score: number;
  kills: number;
  maxHealth: number;
  currentHealth: number;
  tier: SizeTier;
  targetPosition: Vector2; // Mouse/Input target
  
  // Physics Props
  acceleration: number;
  maxSpeed: number;
  friction: number;

  // New Mechanics
  isInvulnerable: boolean;
  skillCooldown: number;
  maxSkillCooldown: number;

  // RPG Stats (Phase 1 Update)
  defense: number;
  damageMultiplier: number;
  
  // Status Effects
  statusEffects: {
    speedBoost: number; // Multiplier, 1 is normal
    shielded: boolean;
    burning: boolean;
    slowed: boolean;
    poisoned: boolean; // New: Earth Tier 5 / Wood Drain
    regen: number; // New: HP per second
    airborne: boolean; // New: For Fire Jump
  };
}

export interface Bot extends Player {
  aiState: 'wander' | 'chase' | 'flee';
  targetEntityId: string | null;
  aiReactionTimer: number; // Delay reaction slightly for realism
}

export interface Food extends Entity {
  value: number;
  isEjected?: boolean; // Created by player W key
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  position: Vector2;
  text: string;
  color: string;
  size: number;
  life: number;
  velocity: Vector2;
}

export interface GameState {
  player: Player;
  bots: Bot[];
  food: Food[];
  particles: Particle[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  lavaZones: LavaZone[]; // New: Fire Skill
  delayedActions: DelayedAction[]; // New: Skill Queue
  
  worldSize: Vector2;
  zoneRadius: number; 
  gameTime: number;
  currentRound: number; // New: 1, 2, 3, 4 (Sudden Death)
  camera: Vector2;
  shakeIntensity: number; 
  kingId: string | null; 
  
  // Input State
  inputs: {
    space: boolean;
    w: boolean;
  };
}