/**
 * EIDOLON-V: BinaryPacker Unit Tests
 * Tests for binary serialization/deserialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BinaryPacker, PacketType, PROTOCOL_MAGIC, PROTOCOL_VERSION } from '../networking/BinaryPacker';

describe('BinaryPacker', () => {
  describe('Protocol Constants', () => {
    it('should have correct protocol magic', () => {
      expect(PROTOCOL_MAGIC).toBe(0x43);
    });

    it('should have correct protocol version', () => {
      expect(PROTOCOL_VERSION).toBe(1);
    });
  });

  describe('packTransforms', () => {
    it('should pack entity transforms correctly', () => {
      const entities = [
        { id: 'player1', x: 100.5, y: 200.5, vx: 10.5, vy: 20.5 },
        { id: 'player2', x: -100.5, y: -200.5, vx: -10.5, vy: -20.5 },
      ];

      const buffer = BinaryPacker.packTransforms(entities, 12345);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should pack empty array', () => {
      const buffer = BinaryPacker.packTransforms([], 0);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle maximum entity count', () => {
      const entities = Array.from({ length: 100 }, (_, i) => ({
        id: `player${i}`,
        x: i * 10,
        y: i * 20,
        vx: i,
        vy: i * 2,
      }));

      const buffer = BinaryPacker.packTransforms(entities, 0);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('packTransformsIndexed', () => {
    it('should pack indexed transforms correctly', () => {
      const entities = [
        { index: 0, x: 100.5, y: 200.5, vx: 10.5, vy: 20.5 },
        { index: 1, x: -100.5, y: -200.5, vx: -10.5, vy: -20.5 },
      ];

      const buffer = BinaryPacker.packTransformsIndexed(entities, 12345);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should be smaller than string-id format', () => {
      const entities = [
        { id: 'player1', x: 100, y: 200, vx: 10, vy: 20 },
      ];
      const indexedEntities = [
        { index: 0, x: 100, y: 200, vx: 10, vy: 20 },
      ];

      const stringBuffer = BinaryPacker.packTransforms(entities, 0);
      const indexedBuffer = BinaryPacker.packTransformsIndexed(indexedEntities, 0);

      expect(indexedBuffer.byteLength).toBeLessThan(stringBuffer.byteLength);
    });

    it('should handle index up to max entities', () => {
      const entities = [
        { index: 4095, x: 100, y: 200, vx: 10, vy: 20 }, // Max u16
      ];

      const buffer = BinaryPacker.packTransformsIndexed(entities, 0);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('unpackTransforms', () => {
    it('should roundtrip transforms correctly', () => {
      const original = [
        { id: 'player1', x: 100.5, y: 200.5, vx: 10.5, vy: 20.5 },
      ];

      const buffer = BinaryPacker.packTransforms(original, 12345);
      const results: typeof original = [];

      BinaryPacker.unpackAndApply(buffer, (id, x, y, vx, vy) => {
        results.push({ id, x, y, vx, vy });
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('player1');
      expect(results[0].x).toBeCloseTo(100.5, 1);
      expect(results[0].y).toBeCloseTo(200.5, 1);
    });

    it('should unpack multiple entities', () => {
      const original = [
        { id: 'p1', x: 100, y: 200, vx: 10, vy: 20 },
        { id: 'p2', x: 300, y: 400, vx: 30, vy: 40 },
        { id: 'p3', x: 500, y: 600, vx: 50, vy: 60 },
      ];

      const buffer = BinaryPacker.packTransforms(original, 0);
      const results: typeof original = [];

      BinaryPacker.unpackAndApply(buffer, (id, x, y, vx, vy) => {
        results.push({ id, x, y, vx, vy });
      });

      expect(results).toHaveLength(3);
    });
  });

  describe('unpackTransformsIndexed', () => {
    it('should roundtrip indexed transforms correctly', () => {
      const original = [
        { index: 5, x: 100.5, y: 200.5, vx: 10.5, vy: 20.5 },
      ];

      const buffer = BinaryPacker.packTransformsIndexed(original, 12345);
      const results: typeof original = [];

      BinaryPacker.unpackTransformsIndexed(buffer, (index, x, y, vx, vy) => {
        results.push({ index, x, y, vx, vy });
      });

      expect(results).toHaveLength(1);
      expect(results[0].index).toBe(5);
      expect(results[0].x).toBeCloseTo(100.5, 1);
    });

    it('should unpack timestamp correctly', () => {
      const original = [
        { index: 0, x: 100, y: 200, vx: 10, vy: 20 },
      ];

      const timestamp = 12345.67;
      const buffer = BinaryPacker.packTransformsIndexed(original, timestamp);

      const unpackedTimestamp = BinaryPacker.unpackTransformsIndexed(buffer, (index, x, y, vx, vy) => { });

      expect(unpackedTimestamp).toBeCloseTo(timestamp, 2);
    });
  });

  describe('Protocol Validation', () => {
    it('should reject invalid protocol magic', () => {
      // Create invalid buffer with wrong magic
      const invalidBuffer = new ArrayBuffer(10);
      const view = new DataView(invalidBuffer);
      view.setUint8(0, 0xFF); // Wrong magic
      view.setUint8(1, PROTOCOL_VERSION);

      const result = BinaryPacker.unpackAndApply(invalidBuffer, () => { });
      expect(result).toBeNull();
    });

    it('should reject invalid protocol version', () => {
      const invalidBuffer = new ArrayBuffer(10);
      const view = new DataView(invalidBuffer);
      view.setUint8(0, PROTOCOL_MAGIC);
      view.setUint8(1, 99); // Wrong version

      const result = BinaryPacker.unpackAndApply(invalidBuffer, () => { });
      expect(result).toBeNull();
    });

    it('should reject truncated buffer', () => {
      const truncated = new ArrayBuffer(2); // Just magic + version
      const view = new DataView(truncated);
      view.setUint8(0, PROTOCOL_MAGIC);
      view.setUint8(1, PROTOCOL_VERSION);

      const result = BinaryPacker.unpackAndApply(truncated, () => { });
      expect(result).toBeNull();
    });
  });

  describe('Buffer Pool', () => {
    it('should reuse buffers from pool', () => {
      // Pack twice, should potentially reuse
      const entities1 = [{ id: 'p1', x: 100, y: 200, vx: 10, vy: 20 }];
      const entities2 = [{ id: 'p2', x: 300, y: 400, vx: 30, vy: 40 }];

      const buffer1 = BinaryPacker.packTransforms(entities1, 0);
      const buffer2 = BinaryPacker.packTransforms(entities2, 0);

      // Both should be valid ArrayBuffers
      expect(buffer1).toBeInstanceOf(ArrayBuffer);
      expect(buffer2).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle concurrent packing safely', () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const entities = [{ id: `p${i}`, x: i * 10, y: i * 20, vx: i, vy: i * 2 }];
            return BinaryPacker.packTransforms(entities, i);
          })
        );
      }

      return Promise.all(promises).then((buffers) => {
        buffers.forEach((buffer) => {
          expect(buffer).toBeInstanceOf(ArrayBuffer);
        });
      });
    });
  });

  describe('Float Precision', () => {
    it('should handle float32 precision correctly', () => {
      const original = [
        { id: 'p1', x: 0.123456789, y: 0.987654321, vx: 1.23456789, vy: 9.87654321 },
      ];

      const buffer = BinaryPacker.packTransforms(original, 0);
      const results: typeof original = [];

      BinaryPacker.unpackAndApply(buffer, (id, x, y, vx, vy) => {
        results.push({ id, x, y, vx, vy });
      });

      // Float32 has ~7 decimal digits of precision
      expect(results[0].x).toBeCloseTo(original[0].x, 5);
      expect(results[0].y).toBeCloseTo(original[0].y, 5);
    });

    it('should handle edge case values', () => {
      const original = [
        { id: 'p1', x: 0, y: 0, vx: 0, vy: 0 },
        { id: 'p2', x: -0, y: -0, vx: -0, vy: -0 },
        { id: 'p3', x: 1e6, y: -1e6, vx: 1e-6, vy: -1e-6 },
      ];

      const buffer = BinaryPacker.packTransforms(original, 0);
      const results: typeof original = [];

      BinaryPacker.unpackAndApply(buffer, (id, x, y, vx, vy) => {
        results.push({ id, x, y, vx, vy });
      });

      expect(results).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty callback gracefully', () => {
      const entities = [{ id: 'p1', x: 100, y: 200, vx: 10, vy: 20 }];
      const buffer = BinaryPacker.packTransforms(entities, 0);

      // Should not throw
      expect(() => {
        BinaryPacker.unpackTransforms(buffer, () => { });
      }).not.toThrow();
    });

    it('should handle malformed string data', () => {
      // Create buffer with corrupted string length
      const buffer = new ArrayBuffer(20);
      const view = new DataView(buffer);
      view.setUint8(0, PROTOCOL_MAGIC);
      view.setUint8(1, PROTOCOL_VERSION);
      view.setUint16(2, PacketType.TRANSFORM_UPDATE);
      view.setUint16(4, 1); // 1 entity
      view.setUint32(6, 0); // timestamp
      view.setUint16(10, 65535); // Invalid string length

      const result = BinaryPacker.unpackAndApply(buffer, () => { });
      expect(result).toBeNull();
    });
  });
});
