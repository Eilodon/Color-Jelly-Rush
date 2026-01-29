import { MAX_ENTITIES } from './EntityFlags';

export class ConfigStore {
    // [magneticRadius, damageMult, speedMult, pickupRange, visionRange, _pad, _pad, _pad]
    // Stride = 8
    public static readonly STRIDE = 8;
    public static readonly data = new Float32Array(MAX_ENTITIES * ConfigStore.STRIDE);

    static set(id: number, magneticRadius: number, damageMult: number, speedMult: number, pickupRange: number, visionRange: number) {
        const idx = id * ConfigStore.STRIDE;
        this.data[idx] = magneticRadius;
        this.data[idx + 1] = damageMult;
        this.data[idx + 2] = speedMult;
        this.data[idx + 3] = pickupRange;
        this.data[idx + 4] = visionRange;
    }

    // Accessors
    static getMagneticRadius(id: number): number {
        return this.data[id * ConfigStore.STRIDE];
    }

    static getDamageMultiplier(id: number): number {
        return this.data[id * ConfigStore.STRIDE + 1];
    }

    static getSpeedMultiplier(id: number): number {
        return this.data[id * ConfigStore.STRIDE + 2];
    }
}
