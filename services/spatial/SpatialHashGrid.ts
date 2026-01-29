// EIDOLON ARCHITECT: Zero-Allocation Spatial Hash Grid
// Flat Array Linked List Architecture - Zero GC Pressure

import { fastMath } from '../math/FastMath';
import { Entity } from '../../types';
import { TransformStore, PhysicsStore, EntityLookup } from '../engine/dod/ComponentStores';

export interface SpatialHashConfig {
  worldSize: number;
  cellSize: number;
  maxEntities: number;
  enableDynamicResizing: boolean;
  enableMultiLevel: boolean;
}

export interface SpatialQueryResult {
  indices: number[]; // DOD Indices
  cellCount: number;
  queryTime: number;
}

export class SpatialHashGrid {
  // EIDOLON ARCHITECT: Flat Array Linked List (Zero Allocation)
  private cellHead: Int32Array;      // First entity in each cell (-1 if empty)
  private nextEntity: Int32Array;    // Next entity in linked list (-1 if end)
  private staticEntityIndices: Set<number> = new Set();

  private config: SpatialHashConfig;
  private cellCount: number;
  private totalCells: number;
  private worldBounds: { min: number; max: number };

  // Reusable temp arrays (pre-allocated)
  private tempCellArray: number[] = [];

  // Debug stats
  private queryCount: number = 0;
  private totalQueryTime: number = 0;

  constructor(config: Partial<SpatialHashConfig> = {}) {
    this.config = {
      worldSize: 6000,
      cellSize: 150,
      maxEntities: 10000,
      enableDynamicResizing: true,
      enableMultiLevel: false,
      ...config
    };

    this.cellCount = Math.ceil(this.config.worldSize / this.config.cellSize);
    this.totalCells = this.cellCount * this.cellCount;
    this.worldBounds = {
      min: -this.config.worldSize / 2,
      max: this.config.worldSize / 2
    };

    // EIDOLON ARCHITECT: Pre-allocate flat arrays
    this.cellHead = new Int32Array(this.totalCells);
    this.nextEntity = new Int32Array(this.config.maxEntities);

    // Initialize to -1 (empty/end-of-list sentinel)
    this.cellHead.fill(-1);
    this.nextEntity.fill(-1);
  }

  private hashPosition(x: number, y: number): number {
    const gridX = Math.floor((x + this.worldBounds.max) / this.config.cellSize);
    const gridY = Math.floor((y + this.worldBounds.max) / this.config.cellSize);
    const clampedX = fastMath.clamp(gridX, 0, this.cellCount - 1);
    const clampedY = fastMath.clamp(gridY, 0, this.cellCount - 1);
    return clampedY * this.cellCount + clampedX;
  }

  private getCellsForBounds(minX: number, maxX: number, minY: number, maxY: number, outCells: number[]): void {
    outCells.length = 0;

    const minCellX = Math.floor((minX + this.worldBounds.max) / this.config.cellSize);
    const maxCellX = Math.floor((maxX + this.worldBounds.max) / this.config.cellSize);
    const minCellY = Math.floor((minY + this.worldBounds.max) / this.config.cellSize);
    const maxCellY = Math.floor((maxY + this.worldBounds.max) / this.config.cellSize);

    const clampedMinX = fastMath.clamp(minCellX, 0, this.cellCount - 1);
    const clampedMaxX = fastMath.clamp(maxCellX, 0, this.cellCount - 1);
    const clampedMinY = fastMath.clamp(minCellY, 0, this.cellCount - 1);
    const clampedMaxY = fastMath.clamp(maxCellY, 0, this.cellCount - 1);

    for (let x = clampedMinX; x <= clampedMaxX; x++) {
      for (let y = clampedMinY; y <= clampedMaxY; y++) {
        outCells.push(y * this.cellCount + x);
      }
    }
  }

  // EIDOLON ARCHITECT: O(1) Insert via Linked List Prepend
  add(entityIndex: number, isStatic: boolean = false): void {
    // Read entity position and radius from DOD stores
    const tIdx = entityIndex * 8;
    const x = TransformStore.data[tIdx];
    const y = TransformStore.data[tIdx + 1];
    const radius = PhysicsStore.data[entityIndex * 8 + 4] || 10;

    // Get cells this entity occupies (writes to tempCellArray - pre-allocated)
    this.getCellsForBounds(x - radius, x + radius, y - radius, y + radius, this.tempCellArray);

    // Insert into each cell (linked list prepend - O(1) per cell)
    for (let i = 0; i < this.tempCellArray.length; i++) {
      const cellIndex = this.tempCellArray[i];

      // CRITICAL: Linked list prepend (zero allocation)
      // nextEntity[entityIndex] points to current head (or -1 if empty)
      this.nextEntity[entityIndex] = this.cellHead[cellIndex];
      // cellHead now points to this entity
      this.cellHead[cellIndex] = entityIndex;
    }

    if (isStatic) {
      this.staticEntityIndices.add(entityIndex);
    }
  }

  // EIDOLON ARCHITECT: O(cellCount) Clear via Fill
  clear(): void {
    // CRITICAL: Only reset cellHead, nextEntity becomes "unreachable garbage"
    // No need to clear nextEntity - it will be overwritten on next insert
    this.cellHead.fill(-1);
    this.staticEntityIndices.clear();
  }

  // Clear only dynamic entities (keep static)
  clearDynamic(): void {
    // Traverse all cells and rebuild linked lists with only static entities
    for (let cellIndex = 0; cellIndex < this.totalCells; cellIndex++) {
      let newHead = -1;
      let currentEntityIndex = this.cellHead[cellIndex];

      // Traverse existing linked list
      while (currentEntityIndex !== -1) {
        const nextInList = this.nextEntity[currentEntityIndex];

        if (this.staticEntityIndices.has(currentEntityIndex)) {
          // Keep static entity - prepend to new list
          this.nextEntity[currentEntityIndex] = newHead;
          newHead = currentEntityIndex;
        }

        currentEntityIndex = nextInList;
      }

      this.cellHead[cellIndex] = newHead;
    }
  }

  // EIDOLON ARCHITECT: Zero-Allocation Query with Linked List Traversal
  queryRadiusInto(x: number, y: number, radius: number, outResults: number[]): void {
    outResults.length = 0; // Reset output array (no allocation)

    // Get cells to check (writes to tempCellArray - pre-allocated)
    this.getCellsForBounds(x - radius, x + radius, y - radius, y + radius, this.tempCellArray);

    const radiusSq = radius * radius;
    const tData = TransformStore.data;
    const pData = PhysicsStore.data;

    // EIDOLON ARCHITECT: Zero-allocation iteration
    // Note: May produce duplicates if entity spans multiple cells
    // Consumers (collision system) already handle duplicate checks
    for (let c = 0; c < this.tempCellArray.length; c++) {
      const cellIndex = this.tempCellArray[c];

      // CRITICAL: Traverse linked list (zero allocation)
      let currentEntityIndex = this.cellHead[cellIndex];

      while (currentEntityIndex !== -1) {
        // DOD Distance Check (direct array access)
        const tIdx = currentEntityIndex * 8;
        const ex = tData[tIdx];
        const ey = tData[tIdx + 1];
        const er = pData[currentEntityIndex * 8 + 4];

        const dx = x - ex;
        const dy = y - ey;
        const distSq = dx * dx + dy * dy;
        const radSum = radius + er;

        if (distSq <= radSum * radSum) {
          outResults.push(currentEntityIndex);
        }

        // CRITICAL: Advance to next in linked list
        currentEntityIndex = this.nextEntity[currentEntityIndex];
      }
    }
  }

  // Convenience wrapper (allocates array - use queryRadiusInto for hot paths)
  queryRadius(position: { x: number; y: number }, radius: number): SpatialQueryResult {
    const startTime = performance.now();
    const indices: number[] = [];
    this.queryRadiusInto(position.x, position.y, radius, indices);

    this.queryCount++;
    const queryTime = performance.now() - startTime;
    this.totalQueryTime += queryTime;

    return {
      indices,
      cellCount: this.tempCellArray.length,
      queryTime
    };
  }

  // EIDOLON ARCHITECT: O(n) Remove via Linked List Unlink
  remove(entityIndex: number): void {
    // Read entity position and radius from DOD stores
    const tIdx = entityIndex * 8;
    const x = TransformStore.data[tIdx];
    const y = TransformStore.data[tIdx + 1];
    const radius = PhysicsStore.data[entityIndex * 8 + 4] || 10;

    // Get cells this entity was in
    this.getCellsForBounds(x - radius, x + radius, y - radius, y + radius, this.tempCellArray);

    // Remove from each cell's linked list
    for (let i = 0; i < this.tempCellArray.length; i++) {
      const cellIndex = this.tempCellArray[i];

      // CRITICAL: Unlink from linked list (requires traversal)
      let prevIndex = -1;
      let currentIndex = this.cellHead[cellIndex];

      while (currentIndex !== -1) {
        if (currentIndex === entityIndex) {
          // Found it - unlink
          if (prevIndex === -1) {
            // Removing head
            this.cellHead[cellIndex] = this.nextEntity[currentIndex];
          } else {
            // Removing middle/end
            this.nextEntity[prevIndex] = this.nextEntity[currentIndex];
          }
          break;
        }

        prevIndex = currentIndex;
        currentIndex = this.nextEntity[currentIndex];
      }
    }

    this.staticEntityIndices.delete(entityIndex);
  }

  // Update entity position (check if cell changed)
  update(entityIndex: number, isStatic: boolean = false): void {
    // For dynamic entities, simpler to remove and re-add
    // For static entities, check if actually moved
    if (isStatic) {
      // TODO: Optimize by checking if cell boundaries crossed
      // For now, always re-add static entities (rare operation)
    }

    this.remove(entityIndex);
    this.add(entityIndex, isStatic);
  }

  // Legacy compatibility helpers
  getNearby(entity: Entity, radiusOverride?: number): Entity[] {
    const idx = entity.physicsIndex;
    if (idx === undefined) return [];

    const tIdx = idx * 8;
    const x = TransformStore.data[tIdx];
    const y = TransformStore.data[tIdx + 1];

    const indices: number[] = [];
    const r = radiusOverride || entity.radius;

    this.queryRadiusInto(x, y, r, indices);

    const results: Entity[] = [];
    for (let i = 0; i < indices.length; i++) {
      const obj = EntityLookup[indices[i]];
      if (obj) results.push(obj);
    }
    return results;
  }

  insert(entity: Entity): void {
    if (entity.physicsIndex !== undefined) {
      this.add(entity.physicsIndex, entity.isStatic);
    }
  }

  removeStatic(entity: Entity): void {
    if (entity.physicsIndex !== undefined) {
      this.remove(entity.physicsIndex);
    }
  }

  // Stats
  getStats() {
    let occupiedCells = 0;
    let totalEntities = 0;
    let maxChainLength = 0;

    for (let cellIndex = 0; cellIndex < this.totalCells; cellIndex++) {
      let chainLength = 0;
      let currentEntityIndex = this.cellHead[cellIndex];

      while (currentEntityIndex !== -1) {
        chainLength++;
        currentEntityIndex = this.nextEntity[currentEntityIndex];
      }

      if (chainLength > 0) {
        occupiedCells++;
        totalEntities += chainLength;
        maxChainLength = Math.max(maxChainLength, chainLength);
      }
    }

    return {
      totalEntities,
      occupiedCells,
      maxChainLength,
      avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0
    };
  }
}

// Global Export
export { SpatialHashGrid as SpatialGrid };
