/**
 * RENDER TYPES - CJR HIGH PERFORMANCE
 * 
 * Strict typing and const enums for Zero-GC rendering.
 * All entities used in the Render Loop must conform to these types.
 */

// 1. CONST ENUMS (Inlined at compile time = Integer comparison)
export const enum EntityType {
    Player = 0,
    Bot = 1,
    Food = 2,
    Projectile = 3,
    Particle = 4,
    FloatingText = 5,
    Wall = 6
}

export const enum ShapeType {
    Circle = 0,
    Square = 1,
    Triangle = 2,
    Hexagon = 3
}

export const enum PickupType {
    Pigment = 0,
    Neutral = 1,
    Solvent = 2,
    Catalyst = 3,
    Shield = 4,
    CandyVein = 5
}

export const enum EmotionType {
    Happy = 0,
    Hungry = 1,
    Yum = 2,
    Greed = 3,
    Focus = 4,
    Panic = 5,
    Despair = 6,
    Victory = 7,
    Ko = 8
}

// 2. PRIMITIVES (Memory Layout efficient)
export interface Vec2 {
    x: number;
    y: number;
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

// 3. DISCRIMINATED UNIONS
export interface BaseRenderEntity {
    id: string; // Keep string for compatibility, eventually map to int
    type: EntityType;
    x: number;
    y: number;
    radius: number;
    active: boolean; // instead of isDead
}

export interface RenderPlayer extends BaseRenderEntity {
    type: EntityType.Player | EntityType.Bot;
    vx: number;
    vy: number;
    shape: ShapeType;
    pigment: RGB; // Current color
    targetPigment: RGB;
    emotion: EmotionType;
    ring: 1 | 2 | 3;
    matchPercent: number; // 0-1
    tattoos: number[]; // Enum IDs
}

export interface RenderFood extends BaseRenderEntity {
    type: EntityType.Food;
    kind: PickupType;
    pigment?: RGB;
    val: number;
}

export interface RenderProjectile extends BaseRenderEntity {
    type: EntityType.Projectile;
    kind: number; // Enum for proj type
    ownerId: string;
}

export interface RenderParticle extends BaseRenderEntity {
    type: EntityType.Particle;
    life: number;
    maxLife: number;
    color: number; // Int color 0xRRGGBB
    style: number; // Enum style
}

export interface RenderText {
    type: EntityType.FloatingText;
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    size: number;
}

// 4. THE UNION TYPE
export type RenderEntity =
    | RenderPlayer
    | RenderFood
    | RenderProjectile
    | RenderParticle
    | RenderText;
