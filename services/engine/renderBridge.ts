/**
 * DOD RENDER BRIDGE
 * =============================================================================
 * Provides direct access to PhysicsWorld arrays for rendering.
 * Use this for high-performance rendering that bypasses Entity objects.
 *
 * Current Architecture:
 * - Physics runs on Float32Array (DOD) for cache efficiency
 * - After physics, data syncs back to Entity objects for game logic compatibility
 * - Renderer can read from either:
 *   a) Entity objects (current approach - fully compatible)
 *   b) PhysicsWorld arrays directly (higher performance, DOD approach)
 *
 * For most use cases, reading from Entity objects (after sync) is sufficient.
 * Use direct array access for batch rendering of 100+ entities.
 * =============================================================================
 */

import { PhysicsWorld, getPhysicsWorld } from './context';
import { Entity } from '../../types';

// Position data stride (x, y per entity)
const STRIDE = 2;

/**
 * Get interpolated positions for a batch of entities directly from PhysicsWorld
 * Returns Float32Array with [x0, y0, x1, y1, ...] for efficient batch transfer to GPU
 *
 * @param entityIds Array of entity IDs to get positions for
 * @param alpha Interpolation factor (0 = prevPosition, 1 = currentPosition)
 * @param output Optional pre-allocated output array (reuse for zero GC)
 * @returns Float32Array with interpolated positions
 */
export const getInterpolatedPositionsBatch = (
  entityIds: string[],
  alpha: number,
  output?: Float32Array
): Float32Array => {
  const world = getPhysicsWorld();
  const count = entityIds.length;
  const result = output || new Float32Array(count * STRIDE);

  for (let i = 0; i < count; i++) {
    const index = world.getIndex(entityIds[i]);
    if (index === -1) continue;

    const posIdx = index * STRIDE;
    const prevX = world.prevPositions[posIdx];
    const prevY = world.prevPositions[posIdx + 1];
    const currX = world.positions[posIdx];
    const currY = world.positions[posIdx + 1];

    const outIdx = i * STRIDE;
    result[outIdx] = prevX + (currX - prevX) * alpha;
    result[outIdx + 1] = prevY + (currY - prevY) * alpha;
  }

  return result;
};

/**
 * Get interpolated position for a single entity
 * Faster than going through Entity object for hot paths
 */
export const getInterpolatedPosition = (
  entityId: string,
  alpha: number
): { x: number; y: number } | null => {
  const world = getPhysicsWorld();
  const index = world.getIndex(entityId);
  if (index === -1) return null;

  const posIdx = index * STRIDE;
  const prevX = world.prevPositions[posIdx];
  const prevY = world.prevPositions[posIdx + 1];
  const currX = world.positions[posIdx];
  const currY = world.positions[posIdx + 1];

  return {
    x: prevX + (currX - prevX) * alpha,
    y: prevY + (currY - prevY) * alpha,
  };
};

/**
 * Batch interpolate entities and write directly to a target buffer
 * Useful for WebGL instanced rendering or compute shaders
 *
 * @param entities Array of entities to interpolate
 * @param alpha Interpolation factor
 * @param targetBuffer Pre-allocated buffer to write to
 * @param offsetX Byte offset for X coordinate in buffer
 * @param offsetY Byte offset for Y coordinate in buffer
 * @param strideBytes Stride between entities in bytes
 */
export const interpolateToBuffer = (
  entities: Entity[],
  alpha: number,
  targetBuffer: Float32Array,
  offsetX: number = 0,
  offsetY: number = 1,
  strideBytes: number = 2
): void => {
  const world = getPhysicsWorld();
  const len = entities.length;

  for (let i = 0; i < len; i++) {
    const entity = entities[i];
    const index = world.getIndex(entity.id);

    let x: number, y: number;

    if (index !== -1) {
      // DOD path - read from arrays
      const posIdx = index * STRIDE;
      const prevX = world.prevPositions[posIdx];
      const prevY = world.prevPositions[posIdx + 1];
      const currX = world.positions[posIdx];
      const currY = world.positions[posIdx + 1];
      x = prevX + (currX - prevX) * alpha;
      y = prevY + (currY - prevY) * alpha;
    } else {
      // Fallback - read from Entity object
      const prev = entity.prevPosition || entity.position;
      const curr = entity.position;
      x = prev.x + (curr.x - prev.x) * alpha;
      y = prev.y + (curr.y - prev.y) * alpha;
    }

    const baseIdx = i * strideBytes;
    targetBuffer[baseIdx + offsetX] = x;
    targetBuffer[baseIdx + offsetY] = y;
  }
};

/**
 * Get raw physics arrays for advanced rendering
 * Use with caution - these are live arrays that may change during frame
 */
export const getRawPhysicsArrays = () => {
  const world = getPhysicsWorld();
  return {
    positions: world.positions,
    prevPositions: world.prevPositions,
    velocities: world.velocities,
    radii: world.radii,
    getIndex: (id: string) => world.getIndex(id),
  };
};

/**
 * Batch query for entity visibility culling
 * Returns indices of entities within a rectangular viewport
 */
export const getEntitiesInViewport = (
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
  entityIds: string[]
): number[] => {
  const world = getPhysicsWorld();
  const visible: number[] = [];

  const minX = centerX - halfWidth;
  const maxX = centerX + halfWidth;
  const minY = centerY - halfHeight;
  const maxY = centerY + halfHeight;

  for (let i = 0; i < entityIds.length; i++) {
    const index = world.getIndex(entityIds[i]);
    if (index === -1) continue;

    const posIdx = index * STRIDE;
    const x = world.positions[posIdx];
    const y = world.positions[posIdx + 1];
    const r = world.radii[index];

    // AABB check with entity radius
    if (x + r >= minX && x - r <= maxX && y + r >= minY && y - r <= maxY) {
      visible.push(i);
    }
  }

  return visible;
};

// Export PhysicsWorld type for consumers
export { PhysicsWorld };
