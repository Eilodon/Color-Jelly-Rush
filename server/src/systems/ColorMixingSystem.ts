/**
 * REFORGED: EIDOLON-V COLOR MIXING SYSTEM (DATA-ORIENTED)
 * 
 * "We do not allocate. We overwrite."
 * 
 * ARCHITECTURE:
 * - Single Float32Array for all entities (Zero-Copy)
 * - Index-based access (O(1))
 * - Vectorized math layout: [R, G, B,  R, G, B, ...]
 */

export interface PigmentVec3 {
  r: number;
  g: number;
  b: number;
}

// Global buffer: 2000 entities * 3 floats = 24KB (CPU Cache friendly)
// In a real ECS, this would be part of a larger ComponentStore
const MAX_ENTITIES = 2000;
const BUFFER_SIZE = MAX_ENTITIES * 3;
export const pigmentBuffer = new Float32Array(BUFFER_SIZE);

// Entity ID Registry: String ID -> Buffer Index
// We use a Map for registry, but logic runs on Indices.
const registry = new Map<string, number>();
const freeIndices: number[] = [];

// Initialize free indices
for (let i = MAX_ENTITIES - 1; i >= 0; i--) {
  freeIndices.push(i);
}

// Indices constants
const R = 0;
const G = 1;
const B = 2;

export class ColorMixingSystem {

  // --- LIFECYCLE MANAGEMENT ---

  /**
   * Allocates a slot for an entity.
   * @returns Index in the buffer, or -1 if full.
   */
  static register(entityId: string, initialColor?: PigmentVec3): number {
    if (registry.has(entityId)) return registry.get(entityId)!;

    if (freeIndices.length === 0) {
      console.warn('[ColorMixing] Buffer overflow! Increase MAX_ENTITIES');
      return -1;
    }

    const idx = freeIndices.pop()!;
    registry.set(entityId, idx);

    if (initialColor) {
      this.setColor(idx, initialColor.r, initialColor.g, initialColor.b);
    }

    return idx;
  }

  static unregister(entityId: string) {
    const idx = registry.get(entityId);
    if (idx !== undefined) {
      registry.delete(entityId);
      freeIndices.push(idx);
      // Zero out for safety (optional in release build)
      const ptr = idx * 3;
      pigmentBuffer[ptr + R] = 0;
      pigmentBuffer[ptr + G] = 0;
      pigmentBuffer[ptr + B] = 0;
    }
  }

  static getIndex(entityId: string): number {
    return registry.get(entityId) ?? -1;
  }

  // --- ZERO-COPY MATH ---

  /**
   * Sets color directly into buffer.
   */
  static setColor(idx: number, r: number, g: number, b: number) {
    if (idx < 0) return;
    const ptr = idx * 3;
    pigmentBuffer[ptr + R] = r;
    pigmentBuffer[ptr + G] = g;
    pigmentBuffer[ptr + B] = b;
  }

  /**
   * Mixes target color INTO current entity's color.
   * @param idx Entity Index
   * @param targetR Target Red
   * @param targetG Target Green
   * @param targetB Target Blue
   * @param ratio Mixing ratio (0-1)
   */
  static mixPigment(idx: number, targetR: number, targetG: number, targetB: number, ratio: number) {
    if (idx < 0) return;
    const ptr = idx * 3;

    // Direct buffer read/write - NO OBJECT ALLOCATION
    pigmentBuffer[ptr + R] += (targetR - pigmentBuffer[ptr + R]) * ratio;
    pigmentBuffer[ptr + G] += (targetG - pigmentBuffer[ptr + G]) * ratio;
    pigmentBuffer[ptr + B] += (targetB - pigmentBuffer[ptr + B]) * ratio;
  }

  /**
   * Calculates match score between two entities.
   * Uses squared distance to avoid Sqrt for performance where possible.
   */
  static getMatchScore(idxA: number, idxB: number): number {
    if (idxA < 0 || idxB < 0) return 0;

    const ptrA = idxA * 3;
    const ptrB = idxB * 3;

    const dr = pigmentBuffer[ptrA + R] - pigmentBuffer[ptrB + R];
    const dg = pigmentBuffer[ptrA + G] - pigmentBuffer[ptrB + G];
    const db = pigmentBuffer[ptrA + B] - pigmentBuffer[ptrB + B];

    // dist = sqrt(dr^2 + dg^2 + db^2)
    // maxDist = sqrt(3) ~ 1.732
    // match = (1 - dist/maxDist)^1.1 (from original logic)

    const distSq = dr * dr + dg * dg + db * db;
    const dist = Math.sqrt(distSq);
    const maxDist = 1.73205; // Sqrt(3)

    const raw = 1.0 - (dist / maxDist);
    const clamped = raw < 0 ? 0 : (raw > 1 ? 1 : raw); // Math.max(0, Math.min(1, raw))

    return Math.pow(clamped, 1.1);
  }

  // --- COMPATIBILITY / SYNC LAYER ---

  /**
   * Syncs buffer data TO a Schema Object.
   * Use this when you need to send updates to client.
   */
  static syncToSchema(entityId: string, outSchema: { pigment: PigmentVec3 }) {
    const idx = registry.get(entityId);
    if (idx === undefined) return;

    const ptr = idx * 3;
    outSchema.pigment.r = pigmentBuffer[ptr + R];
    outSchema.pigment.g = pigmentBuffer[ptr + G];
    outSchema.pigment.b = pigmentBuffer[ptr + B];
  }

  /**
   * Reads FROM a Schema Object into Buffer.
   */
  static syncFromSchema(entityId: string, inSchema: { pigment: PigmentVec3 }) {
    const idx = this.register(entityId);
    const ptr = idx * 3;
    pigmentBuffer[ptr + R] = inSchema.pigment.r;
    pigmentBuffer[ptr + G] = inSchema.pigment.g;
    pigmentBuffer[ptr + B] = inSchema.pigment.b;
  }

  // --- LEGACY ADAPTERS (For existing code compat) ---
  // Warning: These create objects. Refactor call sites to use buffer API for max perf.

  static processColorMixing(
    playerId: string,
    current: PigmentVec3,
    target: PigmentVec3,
    ratio: number = 0.1
  ): PigmentVec3 {
    // Register transiently if needed (Performance hit!)
    // In "God Mode", we assume player is already registered.
    let idx = registry.get(playerId);

    if (idx === undefined) {
      idx = this.register(playerId, current);
    } else {
      // Ensure sync
      this.setColor(idx, current.r, current.g, current.b);
    }

    this.mixPigment(idx, target.r, target.g, target.b, ratio);

    // Return new object (Legacy behavior)
    const ptr = idx * 3;
    return {
      r: pigmentBuffer[ptr + R],
      g: pigmentBuffer[ptr + G],
      b: pigmentBuffer[ptr + B]
    };
  }
}

export const colorMixingSystem = ColorMixingSystem;
