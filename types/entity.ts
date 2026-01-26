import { Vector2 } from './shared';
export type { Vector2 };

export interface Entity {
    id: string;
    position: Vector2;
    velocity: Vector2;
    radius: number; // Represents Mass/Size
    color: string;  // CSS string for rendering (derived from pigment)
    isDead: boolean;
    trail: Vector2[];
    components?: Map<string, any>;
}

import { PickupKind, PigmentVec3 } from '../services/cjr/cjrTypes';

export interface Food extends Entity {
    value: number;
    isEjected?: boolean;
    kind: PickupKind;       // CJR specific
    pigment?: PigmentVec3; // For pigment/candy_vein
}

export interface Projectile extends Entity {
    ownerId: string;
    damage: number;
    type: 'web' | 'ice' | 'sting'; // Keep for now as skill effects
    duration: number;
}

export interface Particle extends Entity {
    life: number;
    maxLife: number;
    style?: 'dot' | 'ring' | 'line';
    lineLength?: number;
    lineWidth?: number;
    angle?: number;

    // Synergy pattern effects
    isSynergyFusion?: boolean;
    fusionColor?: string;
    isSynergyExplosion?: boolean;
    explosionColor?: string;
    isSynergySpiral?: boolean;
    spiralColor?: string;
    isSynergyGeometric?: boolean;
    geometricSides?: number;
    geometricRadius?: number;
    rotationSpeed?: number;
    geometricColor?: string;

    // Additional synergy effects
    isSynergyEffect?: boolean;
    synergyColor?: string;
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

export interface DelayedAction {
    id: string;
    type: 'dash' | 'blast' | 'shield'; // Simplified
    timer: number;
    ownerId: string;
    data?: any;
}
