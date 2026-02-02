/**
 * EIDOLON-V: DOD Component Stores Unit Tests
 * Tests for Data-Oriented Design TypedArray operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransformStore,
  PhysicsStore,
  StatsStore,
  StateStore,
  InputStore,
  ConfigStore,
  SkillStore,
  TattooStore,
  ProjectileStore,
  EntityLookup,
  resetAllStores,
} from '../dod/ComponentStores';
import { EntityFlags } from '../dod/EntityFlags';
import { MAX_ENTITIES } from '../dod/EntityFlags';

describe('DOD Component Stores', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('TransformStore', () => {
    it('should set and get position correctly', () => {
      const index = 0;
      TransformStore.set(index, 100, 200, 0.5, 1.5);

      expect(TransformStore.getX(index)).toBe(100);
      expect(TransformStore.getY(index)).toBe(200);
      expect(TransformStore.getRotation(index)).toBe(0.5);
      expect(TransformStore.getScale(index)).toBe(1.5);
    });

    it('should set position independently for different entities', () => {
      TransformStore.set(0, 10, 20, 0, 1);
      TransformStore.set(1, 100, 200, 1, 2);

      expect(TransformStore.getX(0)).toBe(10);
      expect(TransformStore.getY(0)).toBe(20);
      expect(TransformStore.getX(1)).toBe(100);
      expect(TransformStore.getY(1)).toBe(200);
    });

    it('should handle boundary indices', () => {
      const lastIndex = MAX_ENTITIES - 1;
      TransformStore.set(lastIndex, 500, 600, 0, 1);

      expect(TransformStore.getX(lastIndex)).toBe(500);
      expect(TransformStore.getY(lastIndex)).toBe(600);
    });

    it('should set prev position correctly', () => {
      TransformStore.setPrevPosition(5, 50, 60);

      expect(TransformStore.getPrevX(5)).toBe(50);
      expect(TransformStore.getPrevY(5)).toBe(60);
    });
  });

  describe('PhysicsStore', () => {
    it('should set and get velocity correctly', () => {
      const index = 0;
      PhysicsStore.setVelocity(index, 10, 20);

      expect(PhysicsStore.getVelocityX(index)).toBe(10);
      expect(PhysicsStore.getVelocityY(index)).toBe(20);
    });

    it('should set and get radius correctly', () => {
      PhysicsStore.setRadius(10, 25.5);

      expect(PhysicsStore.getRadius(10)).toBe(25.5);
    });

    it('should set and get mass correctly', () => {
      PhysicsStore.setMass(3, 100);

      expect(PhysicsStore.getMass(3)).toBe(100);
    });

    it('should set all physics properties at once', () => {
      PhysicsStore.set(0, 5, 10, 100, 20, 0.8, 0.9);

      expect(PhysicsStore.getVelocityX(0)).toBe(5);
      expect(PhysicsStore.getVelocityY(0)).toBe(10);
      expect(PhysicsStore.getMass(0)).toBe(100);
      expect(PhysicsStore.getRadius(0)).toBe(20);
    });
  });

  describe('StatsStore', () => {
    it('should set and get health correctly', () => {
      StatsStore.setCurrentHealth(0, 75);
      StatsStore.setMaxHealth(0, 100);

      expect(StatsStore.getCurrentHealth(0)).toBe(75);
      expect(StatsStore.getMaxHealth(0)).toBe(100);
    });

    it('should set and get score correctly', () => {
      StatsStore.setScore(5, 1500);

      expect(StatsStore.getScore(5)).toBe(1500);
    });

    it('should set all stats at once', () => {
      StatsStore.set(0, 80, 100, 500, 0.5, 1, 1.5);

      expect(StatsStore.getCurrentHealth(0)).toBe(80);
      expect(StatsStore.getMaxHealth(0)).toBe(100);
      expect(StatsStore.getScore(0)).toBe(500);
      expect(StatsStore.getMatchPercent(0)).toBe(0.5);
    });

    it('should clamp health to non-negative values', () => {
      StatsStore.setCurrentHealth(0, -10);

      // Should be clamped or handled gracefully
      const health = StatsStore.getCurrentHealth(0);
      expect(health).toBeLessThanOrEqual(0);
    });
  });

  describe('StateStore', () => {
    it('should set and check flags correctly', () => {
      StateStore.setFlag(0, EntityFlags.ACTIVE | EntityFlags.PLAYER);

      expect(StateStore.isActive(0)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.PLAYER)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.BOT)).toBe(false);
    });

    it('should clear flags correctly', () => {
      StateStore.setFlag(0, EntityFlags.ACTIVE | EntityFlags.PLAYER);
      StateStore.clearFlag(0, EntityFlags.PLAYER);

      expect(StateStore.isActive(0)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.PLAYER)).toBe(false);
    });

    it('should handle multiple entity flags independently', () => {
      StateStore.setFlag(0, EntityFlags.ACTIVE | EntityFlags.PLAYER);
      StateStore.setFlag(1, EntityFlags.ACTIVE | EntityFlags.BOT);
      StateStore.setFlag(2, EntityFlags.DEAD);

      expect(StateStore.isActive(0)).toBe(true);
      expect(StateStore.isActive(1)).toBe(true);
      expect(StateStore.isActive(2)).toBe(false);
      expect(StateStore.hasFlag(0, EntityFlags.PLAYER)).toBe(true);
      expect(StateStore.hasFlag(1, EntityFlags.BOT)).toBe(true);
    });

    it('should handle ALL_FLAGS correctly', () => {
      StateStore.flags[0] = EntityFlags.ALL_FLAGS;

      expect(StateStore.isActive(0)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.PLAYER)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.BOT)).toBe(true);
      expect(StateStore.hasFlag(0, EntityFlags.FOOD)).toBe(true);
    });
  });

  describe('InputStore', () => {
    it('should set and get target position correctly', () => {
      InputStore.setTarget(0, 300, 400);

      expect(InputStore.getTargetX(0)).toBe(300);
      expect(InputStore.getTargetY(0)).toBe(400);
    });

    it('should set and consume skill input', () => {
      InputStore.setSkillActive(0, true);
      expect(InputStore.consumeSkillInput(0)).toBe(true);
      expect(InputStore.consumeSkillInput(0)).toBe(false); // Already consumed
    });

    it('should handle multiple entities independently', () => {
      InputStore.setTarget(0, 100, 200);
      InputStore.setTarget(1, 500, 600);

      expect(InputStore.getTargetX(0)).toBe(100);
      expect(InputStore.getTargetY(0)).toBe(200);
      expect(InputStore.getTargetX(1)).toBe(500);
      expect(InputStore.getTargetY(1)).toBe(600);
    });
  });

  describe('ConfigStore', () => {
    it('should set and get max speed correctly', () => {
      ConfigStore.setMaxSpeed(0, 150);

      expect(ConfigStore.getMaxSpeed(0)).toBe(150);
    });

    it('should set and get speed multiplier correctly', () => {
      ConfigStore.setSpeedMultiplier(0, 1.5);

      expect(ConfigStore.getSpeedMultiplier(0)).toBe(1.5);
    });

    it('should set and get all config at once', () => {
      ConfigStore.set(0, 100, 1.2, 50, 30, 500);

      expect(ConfigStore.getMaxSpeed(0)).toBe(100);
      expect(ConfigStore.getSpeedMultiplier(0)).toBe(1.2);
      expect(ConfigStore.getMagnetRadius(0)).toBe(50);
      expect(ConfigStore.getPickupRange(0)).toBe(30);
      expect(ConfigStore.getVisionRange(0)).toBe(500);
    });
  });

  describe('SkillStore', () => {
    it('should set and get cooldown correctly', () => {
      SkillStore.setCooldown(0, 5.5);

      expect(SkillStore.getCooldown(0)).toBe(5.5);
    });

    it('should set and get max cooldown correctly', () => {
      SkillStore.setMaxCooldown(0, 10);

      expect(SkillStore.getMaxCooldown(0)).toBe(10);
    });

    it('should set and get charge correctly', () => {
      SkillStore.setCharge(0, 3);

      expect(SkillStore.getCharge(0)).toBe(3);
    });

    it('should set and get shape correctly', () => {
      SkillStore.setShape(0, 2);

      expect(SkillStore.getShape(0)).toBe(2);
    });
  });

  describe('TattooStore', () => {
    it('should set and check tattoo flags correctly', () => {
      TattooStore.setTattoo(0, 0); // First bit
      TattooStore.setTattoo(0, 2); // Third bit

      expect(TattooStore.hasTattoo(0, 0)).toBe(true);
      expect(TattooStore.hasTattoo(0, 2)).toBe(true);
      expect(TattooStore.hasTattoo(0, 1)).toBe(false);
    });

    it('should remove tattoo correctly', () => {
      TattooStore.setTattoo(0, 0);
      TattooStore.removeTattoo(0, 0);

      expect(TattooStore.hasTattoo(0, 0)).toBe(false);
    });

    it('should handle multiple entities independently', () => {
      TattooStore.setTattoo(0, 0);
      TattooStore.setTattoo(1, 1);

      expect(TattooStore.hasTattoo(0, 0)).toBe(true);
      expect(TattooStore.hasTattoo(1, 1)).toBe(true);
      expect(TattooStore.hasTattoo(0, 1)).toBe(false);
      expect(TattooStore.hasTattoo(1, 0)).toBe(false);
    });
  });

  describe('ProjectileStore', () => {
    it('should set and get owner index correctly', () => {
      ProjectileStore.setOwnerIndex(0, 5);

      expect(ProjectileStore.getOwnerIndex(0)).toBe(5);
    });

    it('should set and get damage correctly', () => {
      ProjectileStore.setDamage(0, 25);

      expect(ProjectileStore.getDamage(0)).toBe(25);
    });

    it('should set and get duration correctly', () => {
      ProjectileStore.setDuration(0, 3.5);

      expect(ProjectileStore.getDuration(0)).toBe(3.5);
    });

    it('should decrement lifetime correctly', () => {
      ProjectileStore.set(0, 1, 10, 5, 0);
      ProjectileStore.decrementLifetime(0, 0.1);

      expect(ProjectileStore.getLifetime(0)).toBeCloseTo(0.1, 5);
    });
  });

  describe('EntityLookup', () => {
    it('should store and retrieve entity objects', () => {
      const mockEntity = { id: 'test', physicsIndex: 0 } as any;
      EntityLookup[0] = mockEntity;

      expect(EntityLookup[0]).toBe(mockEntity);
    });

    it('should handle undefined entries', () => {
      expect(EntityLookup[100]).toBeUndefined();
    });

    it('should allow clearing entries', () => {
      const mockEntity = { id: 'test', physicsIndex: 0 } as any;
      EntityLookup[0] = mockEntity;
      EntityLookup[0] = undefined as any;

      expect(EntityLookup[0]).toBeUndefined();
    });
  });

  describe('resetAllStores', () => {
    it('should reset all stores to zero', () => {
      // Set some values
      TransformStore.set(0, 100, 200, 0, 1);
      StateStore.setFlag(0, EntityFlags.ACTIVE);
      StatsStore.setScore(0, 1000);

      // Reset
      resetAllStores();

      // Verify reset
      expect(TransformStore.getX(0)).toBe(0);
      expect(StateStore.isActive(0)).toBe(false);
      expect(StatsStore.getScore(0)).toBe(0);
    });

    it('should handle multiple entities', () => {
      for (let i = 0; i < 10; i++) {
        TransformStore.set(i, i * 10, i * 20, 0, 1);
        StateStore.setFlag(i, EntityFlags.ACTIVE);
      }

      resetAllStores();

      for (let i = 0; i < 10; i++) {
        expect(TransformStore.getX(i)).toBe(0);
        expect(StateStore.isActive(i)).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle float precision correctly', () => {
      TransformStore.set(0, 0.1, 0.2, 0.3, 1.1);

      // Float32Array has precision limits
      expect(TransformStore.getX(0)).toBeCloseTo(0.1, 5);
      expect(TransformStore.getY(0)).toBeCloseTo(0.2, 5);
    });

    it('should handle very large values', () => {
      TransformStore.set(0, 1e6, 1e7, 0, 1);

      expect(TransformStore.getX(0)).toBe(1e6);
      expect(TransformStore.getY(0)).toBe(1e7);
    });

    it('should handle concurrent modifications', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        TransformStore.set(i % 10, i, i * 2, 0, 1);
      }

      // Last 10 values should be set correctly
      for (let i = iterations - 10; i < iterations; i++) {
        const index = i % 10;
        expect(TransformStore.getX(index)).toBeGreaterThanOrEqual(iterations - 10);
      }
    });
  });
});
