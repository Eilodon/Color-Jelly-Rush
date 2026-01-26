/**
 * FastMath - High Performance Math Library (REFORGED)
 * 
 * Replaces legacy Lookup Tables (LUT) with Native CPU Instructions.
 * Modern Engines (V8/SpiderMonkey) compile Math.sqrt/sin/cos to direct assembly (SQRTSS/FSIN).
 * LUTs cause cache pollution and are slower in 2026.
 */

class FastMath {
    private static instance: FastMath;

    private readonly TWO_PI = Math.PI * 2;

    private constructor() {
        // No more LUT allocation
    }

    public static getInstance(): FastMath {
        if (!FastMath.instance) {
            FastMath.instance = new FastMath();
        }
        return FastMath.instance;
    }

    /**
     * Native SQRT (Assembly: SQRTSS) - 1-3 CPU Cycles
     */
    public fastSqrt(num: number): number {
        return Math.sqrt(num);
    }

    /**
     * Native Sine (Assembly: FSIN)
     */
    public fastSin(rad: number): number {
        return Math.sin(rad);
    }

    /**
     * Native Cosine
     */
    public fastCos(rad: number): number {
        return Math.cos(rad);
    }

    /**
     * Native Atan2
     */
    public fastAtan2(y: number, x: number): number {
        return Math.atan2(y, x);
    }

    /**
     * Utilities
     */
    public distanceSq(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    }

    public lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    public clamp(value: number, min: number, max: number): number {
        return value < min ? min : (value > max ? max : value);
    }
}

export const fastMath = FastMath.getInstance();
