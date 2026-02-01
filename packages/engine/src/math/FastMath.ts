/**
 * @cjr/engine - FastMath
 * Optimized math utilities - zero dependencies
 */

/**
 * Fast inverse square root (Quake III style)
 * Not as fast as native 1/Math.sqrt on modern engines, but included for reference
 */
export const fastInvSqrt = (x: number): number => {
    return 1 / Math.sqrt(x);
};

/**
 * Fast approximate square root using one Newton-Raphson iteration
 */
export const fastSqrt = (x: number): number => {
    if (x <= 0) return 0;

    // Initial estimate using bit manipulation (doesn't work in JS)
    // Fall back to native sqrt which is well-optimized
    return Math.sqrt(x);
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return value < min ? min : value > max ? max : value;
};

/**
 * Linear interpolation
 */
export const lerp = (a: number, b: number, t: number): number => {
    return a + (b - a) * t;
};

/**
 * Random value in range [min, max)
 */
export const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
};

/**
 * Random integer in range [min, max]
 */
export const randomInt = (min: number, max: number): number => {
    return Math.floor(min + Math.random() * (max - min + 1));
};

/**
 * Euclidean distance between two points (uses sqrt)
 */
export const distance = (
    p1: { x: number; y: number },
    p2: { x: number; y: number }
): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Squared distance (avoid sqrt when only comparing)
 */
export const distanceSquared = (
    p1: { x: number; y: number },
    p2: { x: number; y: number }
): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
};

/**
 * Normalize vector to unit length
 */
export const normalize = (
    out: { x: number; y: number },
    v: { x: number; y: number }
): void => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len > 0.0001) {
        const invLen = 1 / len;
        out.x = v.x * invLen;
        out.y = v.y * invLen;
    } else {
        out.x = 0;
        out.y = 0;
    }
};

/**
 * Dot product of two vectors
 */
export const dot = (
    a: { x: number; y: number },
    b: { x: number; y: number }
): number => {
    return a.x * b.x + a.y * b.y;
};

/**
 * Fast sin/cos lookup table (optional optimization)
 * For now, use native Math functions
 */
export const fastMath = {
    fastSqrt,
    fastInvSqrt,
    clamp,
    lerp,
    randomRange,
    randomInt,
    distance,
    distanceSquared,
    normalize,
    dot,

    // Native wrappers for consistency
    sin: Math.sin,
    cos: Math.cos,
    atan2: Math.atan2,
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
};

export default fastMath;
