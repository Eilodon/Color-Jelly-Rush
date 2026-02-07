/**
 * Integration Tests: Client-Server Sync
 * Tests authoritative server physics sync with client prediction
 * 
 * EIDOLON-V REFACTOR: Updated to use new SchemaBinaryPacker API
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PhysicsSystem,
  MovementSystem,
  TransformStore,
  PhysicsStore,
  InputStore,
  StateStore,
  ConfigStore,
  StatsStore,
  resetAllStores,
  EntityFlags,
  MAX_ENTITIES,
  RING_RADII_SQ,
  THRESHOLDS,
  checkRingTransition,
  defaultWorld,
  StateAccess,
} from '@cjr/engine';
// EIDOLON-V AUDIT FIX: Use new SchemaBinaryPacker API
import { SchemaBinaryPacker } from '@cjr/engine/networking';

const w = defaultWorld;

describe('Client-Server Sync', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('Entity State Sync', () => {
    it('should pack transform data from WorldState to binary buffer', () => {
      // Setup: Create entity at position (100, 200)
      const entityId = 0;
      TransformStore.set(w, entityId, 100, 200, 0, 1);
      PhysicsStore.set(w, entityId, 50, 0, 100, 28);
      StateAccess.activate(w, entityId);

      // Pack transform using new API
      const buffer = SchemaBinaryPacker.packTransformSnapshot(w, 0);
      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify buffer contains header + at least one entity
      // Header: Type(1) + Timestamp(4) + Count(2) = 7 bytes
      // Per entity: ID(2) + X(4) + Y(4) = 10 bytes
      expect(buffer.byteLength).toBe(7 + 10);
    });

    it('should handle multiple entity sync', () => {
      const entityCount = 5;

      // Create multiple entities
      for (let i = 0; i < entityCount; i++) {
        TransformStore.set(w, i, i * 100, i * 50, 0, 1);
        PhysicsStore.set(w, i, i * 10, i * 5, 100, 28);
        StateAccess.activate(w, i);
      }

      const buffer = SchemaBinaryPacker.packTransformSnapshot(w, 0);

      // Should pack all 5 entities
      // Header: 7 bytes
      // Per entity: 10 bytes * 5 = 50 bytes
      expect(buffer.byteLength).toBe(7 + 10 * entityCount);
    });
  });

  describe('Input Application', () => {
    it('should apply target input and update position', () => {
      const entityId = 0;
      const startX = 0, startY = 0;

      // Setup entity
      TransformStore.set(w, entityId, startX, startY, 0, 1);
      PhysicsStore.set(w, entityId, 0, 0, 100, 28);
      InputStore.setTarget(w, entityId, 500, 0); // Target at (500, 0)
      ConfigStore.setMaxSpeed(w, entityId, 150);
      StateAccess.activate(w, entityId);

      // Run physics for 60 frames (1 second at 60fps)
      for (let i = 0; i < 60; i++) {
        MovementSystem.update(w, entityId, 1 / 60);
        PhysicsSystem.update(w, 1 / 60);
      }

      // Entity should have moved towards target
      const finalX = TransformStore.getX(w, entityId);
      expect(finalX).toBeGreaterThan(startX);
      expect(finalX).toBeLessThan(500); // Shouldn't overshoot in 1 second
    });

    it('should respect max speed limit', () => {
      const entityId = 0;
      const maxSpeed = 100;

      TransformStore.set(w, entityId, 0, 0, 0, 1);
      PhysicsStore.set(w, entityId, 0, 0, 100, 28);
      InputStore.setTarget(w, entityId, 1000, 0);
      ConfigStore.setMaxSpeed(w, entityId, maxSpeed);
      StateAccess.activate(w, entityId);

      // Apply movement
      MovementSystem.update(w, entityId, 1 / 60);

      const vx = PhysicsStore.getVelocityX(w, entityId);
      const vy = PhysicsStore.getVelocityY(w, entityId);
      const speed = Math.sqrt(vx * vx + vy * vy);

      expect(speed).toBeLessThanOrEqual(maxSpeed * 1.01); // Allow small tolerance
    });
  });

  describe('Ring Transition Sync', () => {
    it('should correctly detect ring based on position', () => {
      const entityId = 0;

      // Setup entity at ring 1 (outer)
      const ring1X = 1200; // Between R2 (1000) and R1 (1600)
      TransformStore.set(w, entityId, ring1X, 0, 0, 1);

      const entity = {
        physicsIndex: entityId,
        position: { x: ring1X, y: 0 },
        velocity: { x: 0, y: 0 },
        ring: 1 as 1 | 2 | 3,
        matchPercent: 0.6,
        isDead: false,
        statusScalars: {},
        statusMultipliers: {},
        statusTimers: {},
      };

      // Move entity to ring 2 position
      entity.position.x = 800; // Inside R2
      TransformStore.setPosition(w, entityId, 800, 0);

      const result = checkRingTransition(entity);

      expect(result.transitioned).toBe(true);
      expect(result.newRing).toBe(2);
    });

    it('should block transition without sufficient match percent', () => {
      const entityId = 0;

      TransformStore.set(w, entityId, 800, 0, 0, 1);

      const entity = {
        physicsIndex: entityId,
        position: { x: 800, y: 0 },
        velocity: { x: 0, y: 0 },
        ring: 1 as 1 | 2 | 3,
        matchPercent: 0.3, // Below ENTER_RING2 threshold (0.5)
        isDead: false,
        statusScalars: {},
        statusMultipliers: {},
        statusTimers: {},
      };

      const result = checkRingTransition(entity);

      expect(result.transitioned).toBe(false);
      expect(entity.ring).toBe(1); // Still in ring 1
    });
  });

  describe('Server Authority Validation', () => {
    it('should detect speed violations', () => {
      const entityId = 0;
      const maxAllowedSpeed = 150;
      const tolerance = 1.15;

      TransformStore.set(w, entityId, 0, 0, 0, 1);
      // Set velocity above limit (simulating client hack)
      PhysicsStore.set(w, entityId, 200, 0, 100, 28);
      StateAccess.activate(w, entityId);

      const vx = PhysicsStore.getVelocityX(w, entityId);
      const vy = PhysicsStore.getVelocityY(w, entityId);
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Server validation check
      const isViolating = speed > maxAllowedSpeed * tolerance;
      expect(isViolating).toBe(true);

      // Apply clamp
      if (isViolating) {
        const scale = (maxAllowedSpeed * tolerance) / speed;
        PhysicsStore.setVelocity(w, entityId, vx * scale, vy * scale);
      }

      const newSpeed = Math.sqrt(
        PhysicsStore.getVelocityX(w, entityId) ** 2 +
        PhysicsStore.getVelocityY(w, entityId) ** 2
      );
      expect(newSpeed).toBeLessThanOrEqual(maxAllowedSpeed * tolerance * 1.01);
    });
  });
});

describe('Network Protocol', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('should pack binary buffer with correct header format', () => {
    // Setup entity
    const entityId = 0;
    TransformStore.set(w, entityId, 100, 200, 0, 1);
    StateAccess.activate(w, entityId);

    const timestamp = 1234.5;
    const buffer = SchemaBinaryPacker.packTransformSnapshot(w, timestamp);

    // Verify header
    const view = new DataView(buffer);

    // Type byte (offset 0)
    const packetType = view.getUint8(0);
    expect(packetType).toBe(1); // SchemaPacketType.TRANSFORM_UPDATE

    // Timestamp (offset 1, float32 LE)
    const packedTimestamp = view.getFloat32(1, true);
    expect(packedTimestamp).toBeCloseTo(timestamp, 3);

    // Count (offset 5, uint16 LE)
    const count = view.getUint16(5, true);
    expect(count).toBe(1); // One entity
  });

  it('should pack entity data with correct format', () => {
    const entityId = 5;
    const testX = 123.456;
    const testY = 789.012;

    TransformStore.set(w, entityId, testX, testY, 0, 1);
    StateAccess.activate(w, entityId);

    const buffer = SchemaBinaryPacker.packTransformSnapshot(w, 0);
    const view = new DataView(buffer);

    // Entity data starts at offset 7
    // EntityId (offset 7, uint16 LE)
    const packedId = view.getUint16(7, true);
    expect(packedId).toBe(entityId);

    // X (offset 9, float32 LE)
    const packedX = view.getFloat32(9, true);
    expect(packedX).toBeCloseTo(testX, 3);

    // Y (offset 13, float32 LE)
    const packedY = view.getFloat32(13, true);
    expect(packedY).toBeCloseTo(testY, 3);
  });
});
