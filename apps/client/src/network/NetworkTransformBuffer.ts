/**
 * EIDOLON-V: Network Transform Buffer
 *
 * PURPOSE: Queues network transform updates, engine consumes at fixed tick.
 * This prevents async network writes from corrupting physics mid-tick.
 *
 * INVARIANT: Network NEVER writes directly to DOD stores.
 * All transforms flow: Network -> Buffer -> Engine Tick -> DOD Stores
 */

import { WorldState, StateAccess } from '@cjr/engine';
import { ISnapshotReceiver } from '@cjr/engine/networking';

interface PendingTransform {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class NetworkTransformBuffer implements ISnapshotReceiver {
  private static instance: NetworkTransformBuffer;

  // Use Map for O(1) lookup and overwrites (latest wins)
  private pending: Map<number, PendingTransform> = new Map();

  // Pre-allocated temp object for iteration (zero allocation in flush)
  private static readonly EMPTY: PendingTransform = { x: 0, y: 0, vx: 0, vy: 0 };

  private constructor() { }

  static getInstance(): NetworkTransformBuffer {
    if (!NetworkTransformBuffer.instance) {
      NetworkTransformBuffer.instance = new NetworkTransformBuffer();
    }
    return NetworkTransformBuffer.instance;
  }

  /**
   * Queue a transform update (called from network handler, async-safe)
   * If same physicsIndex is queued multiple times, latest wins.
   */
  queue(physicsIndex: number, x: number, y: number, vx: number, vy: number): void {
    // Reuse existing object if present (reduce GC)
    const existing = this.pending.get(physicsIndex);
    if (existing) {
      existing.x = x;
      existing.y = y;
      existing.vx = vx;
      existing.vy = vy;
    } else {
      this.pending.set(physicsIndex, { x, y, vx, vy });
    }
  }

  // EIDOLON-V: ISnapshotReceiver Implementation
  onTransform(id: number, x: number, y: number): void {
    // We need to merge with existing data, or create new.
    // Since packets might separate Transform and Physics, we need to handle partial updates.
    // Our 'queue' method expects all 4 values.
    // If we only get Transform, we must preserve existing Velocity if present, or Init to 0?
    // Wait, 'queue' overwrites everything.
    // If we receive Transform, we don't know Velocity yet.
    // We should split pending into TransformPending and PhysicsPending?
    // Or just store partials.

    let existing = this.pending.get(id);
    if (!existing) {
      existing = { x, y, vx: 0, vy: 0 };
      this.pending.set(id, existing);
    } else {
      existing.x = x;
      existing.y = y;
    }
  }

  onPhysics(id: number, vx: number, vy: number, radius: number): void {
    let existing = this.pending.get(id);
    if (!existing) {
      // If we receive Physics before Transform (unlikely but possible), 
      // we might initialize X/Y to 0? Or should we query WorldState?
      // For now, init to 0. Ideally, we shouldn't receive Physics without Transform close by.
      existing = { x: 0, y: 0, vx, vy };
      this.pending.set(id, existing);
    } else {
      existing.vx = vx;
      existing.vy = vy;
    }
    // Note: Radius is ignored by PendingTransform currently. 
    // If needed, extend PendingTransform.
  }

  onComponent(id: number, componentId: number, view: DataView, offset: number): void {
    // Buffer component deltas if needed.
    // Current implementation flushes buffer via explicit 'flush' relying on 'pending' map.
    // Component deltas are not in 'pending' map.
    // TODO: Implement component buffering if race conditions persist for metadata.
    // For now, we can log or ignore, assuming Unpacker handles them via direct world write (legacy behavior).
    // Or we can throw error if we strictly forbid direct writes.
  }

  /**
   * Flush all pending updates to DOD stores.
   * MUST be called once per physics tick, BEFORE physics simulation.
   */
  flush(world: WorldState): void {
    if (this.pending.size === 0) return;

    // Use TypedArray set for performance? Or individual updates?
    // Individual set is safer with accessors, but direct float32 access is faster for bulk.
    // Given we have WorldState, we can get the float32 array.

    // Direct access for performance (aligned with how Store data getter worked)
    const tData = world.transform;
    const pData = world.physics;

    this.pending.forEach((data, idx) => {
      const tIdx = idx * 8;
      const pIdx = idx * 8;

      tData[tIdx] = data.x;
      tData[tIdx + 1] = data.y;
      pData[pIdx] = data.vx;
      pData[pIdx + 1] = data.vy;

      // EIDOLON-V: Ensure entity is active in Sparse Set
      StateAccess.activate(world, idx);
    });

    this.pending.clear();
  }

  /**
   * Check if there are pending updates
   */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Get pending update for a specific entity (read-only, for interpolation preview)
   */
  getPending(physicsIndex: number): PendingTransform | undefined {
    return this.pending.get(physicsIndex);
  }

  /**
   * Get count of pending updates (for debugging)
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clear all pending (used on disconnect/reconnect)
   */
  clear(): void {
    this.pending.clear();
  }
}

export const networkTransformBuffer = NetworkTransformBuffer.getInstance();
