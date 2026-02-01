import { describe, test, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from '../services/spatial/SpatialHashGrid';
import { TransformStore, PhysicsStore, EntityLookup } from '../services/engine/dod/ComponentStores';

describe('SpatialHashGrid - Flat Array Linked List', () => {
  let grid: SpatialHashGrid;

  beforeEach(() => {
    grid = new SpatialHashGrid({
      worldSize: 3000,
      cellSize: 150,
      maxEntities: 1000,
    });

    // Clear DOD stores for clean tests
    TransformStore.data.fill(0);
    PhysicsStore.data.fill(0);
  });

  describe('Zero-Allocation Architecture', () => {
    test('should use Int32Array for cellHead and nextEntity', () => {
      const gridAny = grid as any;
      expect(gridAny.cellHead).toBeInstanceOf(Int32Array);
      expect(gridAny.nextEntity).toBeInstanceOf(Int32Array);
    });

    test('should initialize cellHead to -1 (empty sentinel)', () => {
      const gridAny = grid as any;
      const cellHead = gridAny.cellHead as Int32Array;

      // Check first and last cells
      expect(cellHead[0]).toBe(-1);
      expect(cellHead[cellHead.length - 1]).toBe(-1);
    });

    test('should not allocate Set in query operations', () => {
      // Setup entity
      const entityIndex = 0;
      TransformStore.data[0] = 0; // x
      TransformStore.data[1] = 0; // y
      PhysicsStore.data[4] = 50; // radius

      grid.add(entityIndex);

      // Query - should not throw or allocate
      const results: number[] = [];
      grid.queryRadiusInto(0, 0, 100, results);

      expect(results).toContain(entityIndex);
    });
  });

  describe('Linked List Insert (O(1))', () => {
    test('should prepend entity to cell linked list', () => {
      const gridAny = grid as any;

      // Add entity at origin
      const entityIndex = 0;
      TransformStore.data[0] = 0; // x
      TransformStore.data[1] = 0; // y
      PhysicsStore.data[4] = 10; // radius

      grid.add(entityIndex);

      // Check that cellHead points to entity
      const cellIndex = gridAny.hashPosition(0, 0);
      expect(gridAny.cellHead[cellIndex]).toBe(entityIndex);
      expect(gridAny.nextEntity[entityIndex]).toBe(-1); // End of list
    });

    test('should handle multiple entities in same cell', () => {
      const gridAny = grid as any;

      // Add two entities at same position
      const entity1 = 0;
      const entity2 = 1;

      TransformStore.data[0] = 0; // entity1 x
      TransformStore.data[1] = 0; // entity1 y
      PhysicsStore.data[4] = 10; // entity1 radius

      TransformStore.data[8] = 5; // entity2 x (same cell)
      TransformStore.data[9] = 5; // entity2 y
      PhysicsStore.data[8 + 4] = 10; // entity2 radius

      grid.add(entity1);
      grid.add(entity2);

      const cellIndex = gridAny.hashPosition(0, 0);

      // Most recent insert should be head
      expect(gridAny.cellHead[cellIndex]).toBe(entity2);
      expect(gridAny.nextEntity[entity2]).toBe(entity1);
      expect(gridAny.nextEntity[entity1]).toBe(-1);
    });
  });

  describe('Query with Linked List Traversal', () => {
    test('should find entities in radius', () => {
      // Add entity at (100, 100)
      const entityIndex = 0;
      TransformStore.data[0] = 100;
      TransformStore.data[1] = 100;
      PhysicsStore.data[4] = 50;

      grid.add(entityIndex);

      // Query nearby
      const results: number[] = [];
      grid.queryRadiusInto(110, 110, 100, results);

      expect(results).toContain(entityIndex);
    });

    test('should not find entities outside radius', () => {
      // Add entity at (0, 0)
      const entityIndex = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 10;

      grid.add(entityIndex);

      // Query far away
      const results: number[] = [];
      grid.queryRadiusInto(1000, 1000, 50, results);

      expect(results).not.toContain(entityIndex);
    });

    test('should handle query with pre-allocated results array', () => {
      const entityIndex = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 50;

      grid.add(entityIndex);

      // Reuse results array
      const results: number[] = [];

      grid.queryRadiusInto(0, 0, 100, results);
      expect(results.length).toBeGreaterThan(0);

      // Query again - should clear and repopulate
      grid.queryRadiusInto(1000, 1000, 100, results);
      expect(results.length).toBe(0);
    });

    test('should traverse entire linked list in cell', () => {
      // Add 3 entities in overlapping cells
      for (let i = 0; i < 3; i++) {
        TransformStore.data[i * 8] = i * 10;
        TransformStore.data[i * 8 + 1] = 0;
        PhysicsStore.data[i * 8 + 4] = 50;
        grid.add(i);
      }

      // Query that spans all entities
      const results: number[] = [];
      grid.queryRadiusInto(10, 0, 200, results);

      // Should find all entities (may have duplicates if spanning multiple cells)
      expect(results.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Remove (Linked List Unlink)', () => {
    test('should remove entity from linked list', () => {
      const gridAny = grid as any;

      const entityIndex = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 10;

      grid.add(entityIndex);

      const cellIndex = gridAny.hashPosition(0, 0);
      expect(gridAny.cellHead[cellIndex]).toBe(entityIndex);

      grid.remove(entityIndex);

      // Cell should be empty again
      expect(gridAny.cellHead[cellIndex]).toBe(-1);
    });

    test('should handle removing head of list', () => {
      const gridAny = grid as any;

      // Add two entities
      const entity1 = 0;
      const entity2 = 1;

      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 10;

      TransformStore.data[8] = 0;
      TransformStore.data[9] = 0;
      PhysicsStore.data[8 + 4] = 10;

      grid.add(entity1);
      grid.add(entity2);

      const cellIndex = gridAny.hashPosition(0, 0);

      // Remove head (entity2)
      grid.remove(entity2);

      // entity1 should now be head
      expect(gridAny.cellHead[cellIndex]).toBe(entity1);
      expect(gridAny.nextEntity[entity1]).toBe(-1);
    });

    test('should not find removed entity in query', () => {
      const entityIndex = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 50;

      grid.add(entityIndex);

      const results1: number[] = [];
      grid.queryRadiusInto(0, 0, 100, results1);
      expect(results1).toContain(entityIndex);

      grid.remove(entityIndex);

      const results2: number[] = [];
      grid.queryRadiusInto(0, 0, 100, results2);
      expect(results2).not.toContain(entityIndex);
    });
  });

  describe('Clear (O(cellCount) Fill)', () => {
    test('should clear all cells efficiently', () => {
      const gridAny = grid as any;

      // Add multiple entities
      for (let i = 0; i < 10; i++) {
        TransformStore.data[i * 8] = i * 100;
        TransformStore.data[i * 8 + 1] = 0;
        PhysicsStore.data[i * 8 + 4] = 50;
        grid.add(i);
      }

      grid.clear();

      // All cellHead entries should be -1
      const cellHead = gridAny.cellHead as Int32Array;
      for (let i = 0; i < cellHead.length; i++) {
        expect(cellHead[i]).toBe(-1);
      }
    });

    test('should not find any entities after clear', () => {
      const entityIndex = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 50;

      grid.add(entityIndex);
      grid.clear();

      const results: number[] = [];
      grid.queryRadiusInto(0, 0, 1000, results);
      expect(results.length).toBe(0);
    });
  });

  describe('clearDynamic (Preserve Static)', () => {
    test('should remove dynamic entities but keep static', () => {
      // Add static entity
      const staticEntity = 0;
      TransformStore.data[0] = 0;
      TransformStore.data[1] = 0;
      PhysicsStore.data[4] = 50;
      grid.add(staticEntity, true);

      // Add dynamic entity
      const dynamicEntity = 1;
      TransformStore.data[8] = 10;
      TransformStore.data[9] = 10;
      PhysicsStore.data[8 + 4] = 50;
      grid.add(dynamicEntity, false);

      grid.clearDynamic();

      // Static entity should still be findable
      const results: number[] = [];
      grid.queryRadiusInto(0, 0, 100, results);
      expect(results).toContain(staticEntity);
      expect(results).not.toContain(dynamicEntity);
    });
  });

  describe('Stats', () => {
    test('should report correct stats', () => {
      // Add entities
      for (let i = 0; i < 5; i++) {
        TransformStore.data[i * 8] = i * 200;
        TransformStore.data[i * 8 + 1] = 0;
        PhysicsStore.data[i * 8 + 4] = 50;
        grid.add(i);
      }

      const stats = grid.getStats();
      expect(stats.totalEntities).toBeGreaterThanOrEqual(5);
      expect(stats.occupiedCells).toBeGreaterThan(0);
      expect(stats.maxChainLength).toBeGreaterThan(0);
    });
  });
});
