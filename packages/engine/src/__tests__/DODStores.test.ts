/**
 * EIDOLON-V: DOD Component Accessors Unit Tests
 * Tests for Data-Oriented Design TypedArray operations
 * 
 * Updated to use generated WorldState and accessor classes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultWorld, MAX_ENTITIES } from '../generated/WorldState';
import {
  TransformAccess,
  PhysicsAccess,
  StatsAccess,
  StateAccess,
  InputAccess,
  ConfigAccess,
  SkillAccess,
  ProjectileAccess,
  EntityFlags,
} from '../generated/ComponentAccessors';

describe('DOD Component Accessors', () => {
  beforeEach(() => {
    defaultWorld.reset();
  });

  describe('TransformAccess', () => {
    it('should set and get position correctly', () => {
      const id = 0;
      TransformAccess.setX(defaultWorld, id, 100);
      TransformAccess.setY(defaultWorld, id, 200);

      expect(TransformAccess.getX(defaultWorld, id)).toBe(100);
      expect(TransformAccess.getY(defaultWorld, id)).toBe(200);
    });

    it('should set position independently for different entities', () => {
      TransformAccess.setX(defaultWorld, 0, 10);
      TransformAccess.setY(defaultWorld, 0, 20);
      TransformAccess.setX(defaultWorld, 1, 100);
      TransformAccess.setY(defaultWorld, 1, 200);

      expect(TransformAccess.getX(defaultWorld, 0)).toBe(10);
      expect(TransformAccess.getY(defaultWorld, 0)).toBe(20);
      expect(TransformAccess.getX(defaultWorld, 1)).toBe(100);
      expect(TransformAccess.getY(defaultWorld, 1)).toBe(200);
    });

    it('should handle boundary indices', () => {
      const lastIndex = MAX_ENTITIES - 1;
      TransformAccess.setX(defaultWorld, lastIndex, 500);
      TransformAccess.setY(defaultWorld, lastIndex, 600);

      expect(TransformAccess.getX(defaultWorld, lastIndex)).toBe(500);
      expect(TransformAccess.getY(defaultWorld, lastIndex)).toBe(600);
    });

    it('should set all values at once', () => {
      // TransformAccess.set takes: world, id, x, y, rotation, scale, prevX, prevY, prevRotation
      TransformAccess.set(defaultWorld, 5, 100, 120, 0.5, 2.0, 0, 0, 0);

      expect(TransformAccess.getX(defaultWorld, 5)).toBe(100);
      expect(TransformAccess.getY(defaultWorld, 5)).toBe(120);
      expect(TransformAccess.getRotation(defaultWorld, 5)).toBe(0.5);
      expect(TransformAccess.getScale(defaultWorld, 5)).toBe(2.0);
    });
  });

  describe('PhysicsAccess', () => {
    it('should set and get velocity correctly', () => {
      const id = 0;
      PhysicsAccess.setVx(defaultWorld, id, 10);
      PhysicsAccess.setVy(defaultWorld, id, 20);

      expect(PhysicsAccess.getVx(defaultWorld, id)).toBe(10);
      expect(PhysicsAccess.getVy(defaultWorld, id)).toBe(20);
    });

    it('should set and get radius correctly', () => {
      PhysicsAccess.setRadius(defaultWorld, 10, 25.5);

      expect(PhysicsAccess.getRadius(defaultWorld, 10)).toBe(25.5);
    });

    it('should set all physics properties at once', () => {
      // PhysicsAccess.set takes: world, id, vx, vy, vRotation, mass, radius, restitution, friction
      PhysicsAccess.set(defaultWorld, 0, 5, 10, 0, 100, 20, 0.8, 0.9);

      expect(PhysicsAccess.getVx(defaultWorld, 0)).toBe(5);
      expect(PhysicsAccess.getVy(defaultWorld, 0)).toBe(10);
      expect(PhysicsAccess.getRadius(defaultWorld, 0)).toBe(20);
    });
  });

  describe('StatsAccess', () => {
    it('should set and get health correctly', () => {
      StatsAccess.setHp(defaultWorld, 0, 75);
      StatsAccess.setMaxHp(defaultWorld, 0, 100);

      expect(StatsAccess.getHp(defaultWorld, 0)).toBe(75);
      expect(StatsAccess.getMaxHp(defaultWorld, 0)).toBe(100);
    });

    it('should set and get score via set method', () => {
      // StatsAccess.set takes: world, id, hp, maxHp, score, matchPercent, defense, damageMultiplier
      StatsAccess.set(defaultWorld, 5, 100, 100, 1500, 0, 1, 1);

      expect(StatsAccess.getScore(defaultWorld, 5)).toBe(1500);
    });

    it('should set all stats at once', () => {
      StatsAccess.set(defaultWorld, 0, 80, 100, 500, 0.5, 1, 1.5);

      expect(StatsAccess.getHp(defaultWorld, 0)).toBe(80);
      expect(StatsAccess.getMaxHp(defaultWorld, 0)).toBe(100);
      expect(StatsAccess.getScore(defaultWorld, 0)).toBe(500);
      expect(StatsAccess.getMatchPercent(defaultWorld, 0)).toBe(0.5);
    });
  });

  describe('StateAccess', () => {
    it('should set and check flags correctly', () => {
      StateAccess.setFlags(defaultWorld, 0, EntityFlags.ACTIVE | EntityFlags.PLAYER);

      expect(StateAccess.isActive(defaultWorld, 0)).toBe(true);
      expect(StateAccess.hasFlag(defaultWorld, 0, EntityFlags.PLAYER)).toBe(true);
      expect(StateAccess.hasFlag(defaultWorld, 0, EntityFlags.BOT)).toBe(false);
    });

    it('should clear flags correctly', () => {
      StateAccess.setFlags(defaultWorld, 0, EntityFlags.ACTIVE | EntityFlags.PLAYER);
      StateAccess.clearFlag(defaultWorld, 0, EntityFlags.PLAYER);

      expect(StateAccess.isActive(defaultWorld, 0)).toBe(true);
      expect(StateAccess.hasFlag(defaultWorld, 0, EntityFlags.PLAYER)).toBe(false);
    });

    it('should handle multiple entity flags independently', () => {
      StateAccess.setFlags(defaultWorld, 0, EntityFlags.ACTIVE | EntityFlags.PLAYER);
      StateAccess.setFlags(defaultWorld, 1, EntityFlags.ACTIVE | EntityFlags.BOT);
      StateAccess.setFlags(defaultWorld, 2, EntityFlags.DEAD);

      expect(StateAccess.isActive(defaultWorld, 0)).toBe(true);
      expect(StateAccess.isActive(defaultWorld, 1)).toBe(true);
      expect(StateAccess.isActive(defaultWorld, 2)).toBe(false);
      expect(StateAccess.hasFlag(defaultWorld, 0, EntityFlags.PLAYER)).toBe(true);
      expect(StateAccess.hasFlag(defaultWorld, 1, EntityFlags.BOT)).toBe(true);
    });

    it('should activate and deactivate entities', () => {
      StateAccess.activate(defaultWorld, 0);
      expect(StateAccess.isActive(defaultWorld, 0)).toBe(true);

      StateAccess.deactivate(defaultWorld, 0);
      expect(StateAccess.isActive(defaultWorld, 0)).toBe(false);
    });

    it('should mark entities as dead', () => {
      StateAccess.markDead(defaultWorld, 0);
      expect(StateAccess.isDead(defaultWorld, 0)).toBe(true);
    });
  });

  describe('InputAccess', () => {
    it('should set and get target position correctly', () => {
      InputAccess.setTargetX(defaultWorld, 0, 300);
      InputAccess.setTargetY(defaultWorld, 0, 400);

      expect(InputAccess.getTargetX(defaultWorld, 0)).toBe(300);
      expect(InputAccess.getTargetY(defaultWorld, 0)).toBe(400);
    });

    it('should handle multiple entities independently', () => {
      InputAccess.setTargetX(defaultWorld, 0, 100);
      InputAccess.setTargetY(defaultWorld, 0, 200);
      InputAccess.setTargetX(defaultWorld, 1, 500);
      InputAccess.setTargetY(defaultWorld, 1, 600);

      expect(InputAccess.getTargetX(defaultWorld, 0)).toBe(100);
      expect(InputAccess.getTargetY(defaultWorld, 0)).toBe(200);
      expect(InputAccess.getTargetX(defaultWorld, 1)).toBe(500);
      expect(InputAccess.getTargetY(defaultWorld, 1)).toBe(600);
    });
  });

  describe('ConfigAccess', () => {
    it('should set and get magneticRadius correctly', () => {
      ConfigAccess.setMagneticRadius(defaultWorld, 0, 50);
      expect(ConfigAccess.getMagneticRadius(defaultWorld, 0)).toBe(50);
    });

    it('should set and get speedMult correctly', () => {
      ConfigAccess.setSpeedMult(defaultWorld, 0, 1.5);
      expect(ConfigAccess.getSpeedMult(defaultWorld, 0)).toBe(1.5);
    });
  });

  describe('SkillAccess', () => {
    it('should set and get cooldown correctly', () => {
      SkillAccess.setCooldown(defaultWorld, 0, 5.5);
      expect(SkillAccess.getCooldown(defaultWorld, 0)).toBe(5.5);
    });

    it('should set and get maxCooldown correctly', () => {
      SkillAccess.setMaxCooldown(defaultWorld, 0, 10);
      expect(SkillAccess.getMaxCooldown(defaultWorld, 0)).toBe(10);
    });

    it('should set and get activeTimer correctly', () => {
      SkillAccess.setActiveTimer(defaultWorld, 0, 2.5);
      expect(SkillAccess.getActiveTimer(defaultWorld, 0)).toBe(2.5);
    });

    it('should set all values at once', () => {
      // SkillAccess.set takes: world, id, cooldown, maxCooldown, activeTimer, shapeId
      SkillAccess.set(defaultWorld, 0, 5.0, 10.0, 2.0, 1);

      expect(SkillAccess.getCooldown(defaultWorld, 0)).toBe(5.0);
      expect(SkillAccess.getMaxCooldown(defaultWorld, 0)).toBe(10.0);
      expect(SkillAccess.getActiveTimer(defaultWorld, 0)).toBe(2.0);
    });
  });

  describe('ProjectileAccess', () => {
    it('should set all properties at once', () => {
      ProjectileAccess.set(defaultWorld, 0, 1, 25, 3.5, 2);

      expect(ProjectileAccess.getOwnerId(defaultWorld, 0)).toBe(1);
      expect(ProjectileAccess.getDamage(defaultWorld, 0)).toBe(25);
      expect(ProjectileAccess.getDuration(defaultWorld, 0)).toBe(3.5);
      expect(ProjectileAccess.getTypeId(defaultWorld, 0)).toBe(2);
    });
  });

  describe('WorldState.reset', () => {
    it('should reset all stores to zero', () => {
      // Set some values
      TransformAccess.setX(defaultWorld, 0, 100);
      StateAccess.activate(defaultWorld, 0);
      StatsAccess.setScore(defaultWorld, 0, 1000);

      // Reset
      defaultWorld.reset();

      // Verify reset
      expect(TransformAccess.getX(defaultWorld, 0)).toBe(0);
      expect(StateAccess.isActive(defaultWorld, 0)).toBe(false);
      expect(StatsAccess.getScore(defaultWorld, 0)).toBe(0);
    });

    it('should handle multiple entities', () => {
      for (let i = 0; i < 10; i++) {
        TransformAccess.setX(defaultWorld, i, i * 10);
        StateAccess.activate(defaultWorld, i);
      }

      defaultWorld.reset();

      for (let i = 0; i < 10; i++) {
        expect(TransformAccess.getX(defaultWorld, i)).toBe(0);
        expect(StateAccess.isActive(defaultWorld, i)).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle float precision correctly', () => {
      TransformAccess.setX(defaultWorld, 0, 0.1);
      TransformAccess.setY(defaultWorld, 0, 0.2);

      // Float32Array has precision limits
      expect(TransformAccess.getX(defaultWorld, 0)).toBeCloseTo(0.1, 5);
      expect(TransformAccess.getY(defaultWorld, 0)).toBeCloseTo(0.2, 5);
    });

    it('should handle very large values', () => {
      TransformAccess.setX(defaultWorld, 0, 1e6);
      TransformAccess.setY(defaultWorld, 0, 1e7);

      expect(TransformAccess.getX(defaultWorld, 0)).toBe(1e6);
      expect(TransformAccess.getY(defaultWorld, 0)).toBe(1e7);
    });

    it('should handle concurrent modifications', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        TransformAccess.setX(defaultWorld, i % 10, i);
      }

      // Last 10 values should be set correctly
      for (let i = iterations - 10; i < iterations; i++) {
        const index = i % 10;
        expect(TransformAccess.getX(defaultWorld, index)).toBeGreaterThanOrEqual(iterations - 10);
      }
    });
  });
});
