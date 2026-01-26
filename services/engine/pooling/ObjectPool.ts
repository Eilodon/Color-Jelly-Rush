/**
 * ObjectPool - Zero-Allocation Memory Management
 * 
 * Provides generic pooling for reusable game entities (Food, Projectiles).
 * Prevents GC spikes by reusing objects instead of allocating/deallocating.
 */

import { Food, Projectile } from '../../../types';

export interface Poolable {
    reset(): void;
}

export class ObjectPool<T> {
    private items: T[] = [];
    private factory: () => T;
    private resetFn: (item: T) => void;

    constructor(factory: () => T, resetFn: (item: T) => void, initialCapacity: number = 100) {
        this.factory = factory;
        this.resetFn = resetFn;

        // Pre-allocate
        for (let i = 0; i < initialCapacity; i++) {
            this.items.push(this.factory());
        }
    }

    public acquire(): T {
        if (this.items.length > 0) {
            const item = this.items.pop()!;
            this.resetFn(item);
            return item;
        }
        return this.factory(); // Expand pool if empty
    }

    public release(item: T): void {
        this.items.push(item);
    }

    public get size(): number {
        return this.items.length;
    }
}

/**
 * Singleton factory for managing specific entity pools
 */
class PooledEntityFactory {
    private foodPool: ObjectPool<Food>;
    private projectilePool: ObjectPool<Projectile>;
    private static instance: PooledEntityFactory;

    private constructor() {
        this.foodPool = new ObjectPool<Food>(
            () => ({
                id: '',
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                radius: 0,
                color: '',
                isDead: true,
                trail: [],
                value: 1,
                isEjected: false,
                kind: 'pigment',
                pigment: { r: 0, g: 0, b: 0 }
            }),
            (f) => {
                f.isDead = false;
                f.trail.length = 0;
                // EIDOLON-V FIX: Zero allocation reset
                if (!f.pigment) f.pigment = { r: 1, g: 1, b: 1 };
                else {
                    f.pigment.r = 1;
                    f.pigment.g = 1;
                    f.pigment.b = 1;
                }
                f.radius = 5;
                f.value = 1;
            },
            1000 // High capacity for food
        );

        this.projectilePool = new ObjectPool<Projectile>(
            () => ({
                id: '',
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                radius: 0,
                color: '',
                isDead: true,
                trail: [],
                ownerId: '',
                damage: 0,
                type: 'ice',
                duration: 0
            }),
            (p) => {
                p.isDead = false;
                p.trail.length = 0;
            },
            200
        );
    }

    public static getInstance(): PooledEntityFactory {
        if (!PooledEntityFactory.instance) {
            PooledEntityFactory.instance = new PooledEntityFactory();
        }
        return PooledEntityFactory.instance;
    }

    public createPooledFood(): ObjectPool<Food> {
        return this.foodPool;
    }

    public createPooledProjectile(): ObjectPool<Projectile> {
        return this.projectilePool;
    }
}

export const pooledEntityFactory = PooledEntityFactory.getInstance();
