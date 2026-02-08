# Color Jelly Rush - Systems Overview

> **Last Updated:** February 8, 2026
> **Purpose:** Complete reference for all game systems and their interactions

---

## 1. Systems Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEMS HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      ENGINE SYSTEMS (Pure DOD)                       │   │
│   │                         @cjr/engine/systems                          │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ MovementSys │  │ PhysicsSys  │  │  SkillSys   │                 │   │
│   │   │             │  │             │  │             │                 │   │
│   │   │ Input→Vel   │  │ Vel→Pos     │  │ Cooldowns   │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      CJR GAME SYSTEMS                                │   │
│   │                      @cjr/engine/modules/cjr                         │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ ColorMath   │  │ RingSystem  │  │ WaveSpawner │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ TattooSys   │  │  BossCJR    │  │ WinCondition│                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      CLIENT SYSTEMS (VFX/UI)                         │   │
│   │                         apps/client                                  │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ JuiceSystem │  │ AudioEngine │  │  AISystem   │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │PhysicsCoord │  │ VisualSys   │  │ CombatSys   │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Engine Systems

### 2.1 MovementSystem

**Location:** `packages/engine/src/systems/MovementSystem.ts`

**Purpose:** Converts player input into velocity

**Data Access (DOD):**
- **Reads:** `world.input` (targetX, targetY), `world.transform` (x, y), `world.config` (speed)
- **Writes:** `world.physics` (vx, vy)

**Algorithm:**
```typescript
// For each active entity in world.activeEntities
const inputIdx = id * STRIDES.INPUT;
const transformIdx = id * STRIDES.TRANSFORM;
const physicsIdx = id * STRIDES.PHYSICS;

const targetX = world.input[inputIdx];     // Target position X
const targetY = world.input[inputIdx + 1]; // Target position Y
const currentX = world.transform[transformIdx];
const currentY = world.transform[transformIdx + 1];

const dx = targetX - currentX;
const dy = targetY - currentY;
// Normalize and apply speed...

world.physics[physicsIdx] = vx;     // Write velocity X
world.physics[physicsIdx + 1] = vy; // Write velocity Y
```

**Constants:**
| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SPEED_BASE` | 150 | Base movement speed |
| `ACCEL` | 2000 | Acceleration rate |
| `DEADZONE` | 1 | Minimum distance to move |

---

### 2.2 PhysicsSystem

**Location:** `packages/engine/src/systems/PhysicsSystem.ts`

**Purpose:** Integrates velocity to update position, applies friction and constraints

**Data Access (DOD):**
- **Reads:** `world.physics` (vx, vy, radius, friction), `world.stateFlags` (ACTIVE)
- **Writes:** `world.transform` (x, y, prevX, prevY), `world.physics` (vx, vy after friction)

**Algorithm:**
```typescript
// For each active entity
const t = id * STRIDES.TRANSFORM;
const p = id * STRIDES.PHYSICS;

// Store previous position for interpolation
world.transform[t + 4] = world.transform[t];     // prevX = x
world.transform[t + 5] = world.transform[t + 1]; // prevY = y

// Apply friction
world.physics[p] *= friction;
world.physics[p + 1] *= friction;

// Integrate position
world.transform[t] += world.physics[p] * dt * PHYSICS_TIME_SCALE;
world.transform[t + 1] += world.physics[p + 1] * dt * PHYSICS_TIME_SCALE;

// Apply circular map constraints (bounce off edges)
```

**Constants:**
| Constant | Value | Description |
|----------|-------|-------------|
| `PHY_MAP_RADIUS` | 2500 | Physics boundary radius |
| `FRICTION_BASE` | 0.92 | Default friction coefficient |
| `PHYSICS_TIME_SCALE` | 10 | Velocity scale factor |
| `BOUNCE_FACTOR` | 1.5 | Wall bounce multiplier |

---

### 2.3 SkillSystem

**Location:** `packages/engine/src/systems/SkillSystem.ts`

**Purpose:** Handles skill activation, cooldowns, and execution

**Data Access (DOD):**
- **Reads:** `world.skill` (cooldown, maxCooldown, shapeId), `world.transform`, `world.physics`
- **Writes:** `world.skill` (cooldown), `world.physics` (velocity for dash), `eventBuffer`

**Shape Skills:**

| Shape | Skill Name | Effect | VFX Event |
|-------|------------|--------|-----------|
| Circle (1) | Jet Dash | Boost velocity 800 in movement direction | `PARTICLE_BURST` (Cyan) |
| Square (2) | Shockwave | AOE knockback, radius 150 | `SHOCKWAVE` |
| Triangle (3) | Pierce | Dash 600 toward target | `PARTICLE_BURST` (Orange) |
| Hex (4) | Vortex | Pull nearby entities, radius 200 | `SHOCKWAVE` |

**Cooldown Flow:**
```
1. Player presses skill input (world.input[idx+2] === 1)
2. Check: world.skill[idx] > 0? → Exit (on cooldown)
3. Execute skill based on shape
4. Reset: world.skill[idx] = maxCooldown
5. Each frame: world.skill[idx] = max(0, cooldown - dt)
```

---

## 3. CJR Game Systems

### 3.1 ColorMath

**Location:** `packages/engine/src/modules/cjr/colorMath.ts`

**Purpose:** Color mixing and matching calculations

**Key Functions:**

| Function | Description |
|----------|-------------|
| `mixPigment(current, consumed, ratio)` | Blend two pigments based on size ratio |
| `calcMatchPercent(player, target)` | Cosine similarity between pigments (0-1) |
| `calcMatchPercentFast(pr, pg, pb, tr, tg, tb)` | Optimized version with raw values |
| `getColorHint(player, target)` | Returns hint like "need more red" |
| `getSnapAlpha(matchPercent)` | Returns 0-1 boost factor when match >= 80% |
| `pigmentToInt(pigment)` | Convert RGB pigment to integer |
| `intToHex(color)` | Convert integer to hex string |

**Match Calculation:**
```
matchPercent = cosine_similarity(player.pigment, target.pigment)
             = (p·t) / (|p| * |t|)
             = dot(p, t) / (magnitude(p) * magnitude(t))
```

---

### 3.2 RingSystem

**Location:** `packages/engine/src/modules/cjr/ringSystem.ts`

**Purpose:** Manage ring progression and commit mechanics

**Key Functions:**

| Function | Description |
|----------|-------------|
| `getRingAtPosition(x, y)` | Returns ring level (1-3) based on distance from center |
| `updateRingLogic(world, entity, dt)` | Process ring transitions (DOD version) |
| `updateRingLogicLegacy(entity, dt)` | Legacy object-based version |
| `checkRingTransition(entity)` | Check if entity can commit to next ring |

**Ring Thresholds:**

| Ring | Distance from Center | Match Required to Commit |
|------|---------------------|-------------------------|
| Ring 1 (Outer) | > 1000 | - |
| Ring 2 (Middle) | 500-1000 | 50% |
| Ring 3 (Center) | < 500 | 70% |

**Commit Bonuses:**

| Transition | Shield Duration | Speed Boost Duration |
|------------|----------------|---------------------|
| Ring 1 → 2 | 2s | 3s |
| Ring 2 → 3 | 3s | 4s |

**One-Way Rule:** Entities can only progress inward (1→2→3), never backward.

---

### 3.3 WaveSpawner

**Location:** `packages/engine/src/modules/cjr/waveSpawner.ts`

**Purpose:** Spawn food entities at regular intervals

**Spawn Rates by Ring:**

| Ring | Interval | Spawn Type Distribution |
|------|----------|------------------------|
| Ring 1 | 8s | 60% pigment, 25% neutral, 15% special |
| Ring 2 | 10s | 60% pigment, 25% neutral, 15% special |
| Ring 3 | 12-14s | 60% pigment, 25% neutral, 15% special |

**Key Functions:**

| Function | Description |
|----------|-------------|
| `updateWaveSpawner(world, state, dt)` | Main update loop (DOD version) |
| `updateWaveSpawnerLegacy(state, dt)` | Legacy object-based version |
| `resetWaveTimers()` | Reset all spawn timers |
| `spawnFoodAt(x, y, type)` | Create food entity at position |

---

### 3.4 TattooSystem

**Location:** `packages/engine/src/modules/cjr/tattoos.ts`

**Purpose:** Roguelite upgrade system

**12 Tattoo Definitions:**

| ID | Name | Effect | Trigger |
|----|------|--------|---------|
| 1 | Thorn | Reflect 20% damage on hit | `onHit` |
| 2 | Leech | Heal 10% on consume | `onConsume` |
| 3 | Haste | +15% speed | Passive |
| 4 | Bulwark | +20% max HP | Passive |
| 5 | Frenzy | +10% attack speed | Passive |
| 6 | Magnet | +25% pickup range | Passive |
| 7 | Ghost | Phase through on skill | `onSkill` |
| 8 | Nova | Skill emits shockwave | `onSkill` |
| 9 | Regen | Heal 1 HP/s | `onUpdate` |
| 10 | Venom | Apply poison on skill | `onSkill` |
| 11 | Mirror | Copy consumed color | `onConsume` |
| 12 | Anchor | Slower but stronger | Passive |

**Tattoo Triggers:**

| Trigger | When Called |
|---------|-------------|
| `triggerTattooOnSkill(entity)` | When skill is used |
| `triggerTattooOnHit(entity, damage)` | When entity takes damage |
| `triggerTattooOnConsume(entity, food)` | When entity eats food |
| `triggerTattooOnUpdate(entity, dt)` | Every frame |

---

### 3.5 BossCJR

**Location:** `packages/engine/src/modules/cjr/bossCjr.ts`

**Purpose:** Boss encounter logic

**Boss Phases:**
1. **Idle** - Boss waiting to spawn
2. **Active** - Boss fighting
3. **Enraged** - Boss at low HP, faster attacks
4. **Dead** - Rush window active

**Contribution System:**
- Damage dealt to boss is tracked per player
- Top 8 contributors get tier rewards

| Tier | Contribution | Reward |
|------|--------------|--------|
| 1 (MVP) | Top 1 | 100% XP + Tattoo + Color Snap |
| 2 | Top 2-3 | 75% XP + Tattoo |
| 3 | Top 4-6 | 50% XP |
| 4 | Top 7-8 | 25% XP |

**Rush Window:**
- Duration: 5 seconds after boss death
- Effect: Match threshold reduced by 10%

---

### 3.6 WinCondition

**Location:** `packages/engine/src/modules/cjr/winCondition.ts`

**Purpose:** Check and handle victory conditions

**Victory Requirements:**
1. Be in Ring 3 (center)
2. Match percent >= 90%
3. Hold for 1.5 seconds

**Algorithm:**
```typescript
if (ring === 3 && matchPercent >= 0.9) {
  holdTimer += dt;

  if (holdTimer % 0.5 < dt) {
    emitHeartbeat(intensity: holdTimer / 1.5);
  }

  if (holdTimer >= 1.5) {
    VICTORY!
  }
} else {
  holdTimer = max(0, holdTimer - dt * 0.5);  // Partial decay
}
```

---

## 4. Client Systems

### 4.1 AISystem (Bot AI)

**Location:** `apps/client/src/game/engine/dod/systems/AISystem.ts`

**Purpose:** Control bot behavior using DOD patterns

**Data Access:**
- **Reads:** `world.transform`, `world.physics`, `world.stats`, `world.pigment`
- **Writes:** `world.input` (bot's target position)

**Features:**
- O(1) entity lookup via ID maps
- Personality-based behavior (aggressive, passive, collector)
- Target selection based on match percent, distance, threat level

---

### 4.2 JuiceSystem (VFX)

**Location:** `apps/client/src/game/visuals/JuiceSystem.ts`

**Purpose:** Apply game "juice" effects (screen shake, particles, etc.)

**Event Handling:**
```typescript
eventBuffer.drain((event) => {
  switch (event.type) {
    case EngineEventType.PARTICLE_BURST:
      particleSystem.emit(event.x, event.y, event.color);
      break;
    case EngineEventType.SHOCKWAVE:
      shockwaveRenderer.play(event.x, event.y, event.radius);
      break;
    case EngineEventType.SCREEN_SHAKE:
      camera.shake(event.intensity);
      break;
  }
});
```

---

### 4.3 AudioEngine

**Location:** `apps/client/src/game/audio/AudioEngine.ts`

**Purpose:** Spatial audio and music management

**Key Functions:**

| Function | Description |
|----------|-------------|
| `initialize()` | Setup Web Audio context |
| `play(sfx, x, y)` | Play positional sound |
| `setListenerPosition(x, y)` | Update listener for spatial audio |
| `setBGMIntensity(level)` | Crossfade BGM layers based on gameplay |

**BGM Intensity Levels:**
| Level | Description |
|-------|-------------|
| 0 | Ambient/calm |
| 1 | Light tension |
| 2 | Action |
| 3 | Intense |
| 4 | Boss/climax |

---

### 4.4 CJRClientRunner

**Location:** `apps/client/src/game/engine/runner/CJRClientRunner.ts`

**Purpose:** Main game loop runner for CJR

**Responsibilities:**
- Coordinate system updates
- Manage game state transitions
- Handle input synchronization
- Trigger DOD → OOP sync for UI

---

### 4.5 PhysicsCoordinator

**Location:** `apps/client/src/game/engine/systems/PhysicsCoordinator.ts`

**Purpose:** Coordinate physics updates between client and server

**Features:**
- Client-side prediction
- Server reconciliation
- Interpolation management

---

## 5. System Update Order

```
EACH GAME TICK (60 Hz):
┌─────────────────────────────────────────────────────┐
│                                                      │
│   1. Input Phase                                     │
│      └─ BufferedInput.syncToStore()                  │
│      └─ world.input[idx * 4 + 0..3] = target, skill  │
│                                                      │
│   2. Movement Phase                                  │
│      └─ MovementSystem.update(world, dt)             │
│      └─ Reads: world.input → Writes: world.physics   │
│                                                      │
│   3. Physics Phase                                   │
│      └─ PhysicsSystem.update(world, dt)              │
│      └─ Reads: world.physics → Writes: world.transform│
│                                                      │
│   4. Skill Phase                                     │
│      └─ SkillSystem.update(world, dt)                │
│      └─ Reads: world.skill → Writes: physics, events │
│                                                      │
│   5. CJR Systems                                     │
│      ├─ updateRingLogic(world, entity, dt)           │
│      ├─ updateWaveSpawner(world, state, dt)          │
│      ├─ updateBossLogic(world, state, dt)            │
│      ├─ updateWinCondition(world, entity, dt)        │
│      └─ triggerTattooOnUpdate(entity, dt)            │
│                                                      │
│   6. Collision/Combat                                │
│      └─ combat.consumePickupDOD(world, ...)          │
│      └─ combat.reduceHealthDOD(world, ...)           │
│                                                      │
│   7. DOD → OOP Sync (for UI)                         │
│      └─ EntityStateBridge.syncFromDOD()              │
│                                                      │
│   8. VFX/Audio (client only)                         │
│      └─ JuiceSystem.update(dt)                       │
│      └─ audioEngine.setListenerPosition(x, y)        │
│                                                      │
│   9. React Notification                              │
│      └─ gameStateManager.notifySubscribers()         │
│                                                      │
└─────────────────────────────────────────────────────┘

EACH RENDER FRAME (Display Hz):
┌─────────────────────────────────────────────────────┐
│                                                      │
│   1. Calculate interpolation alpha                   │
│      └─ alpha = accumulator / tickRate               │
│                                                      │
│   2. Interpolate positions                           │
│      └─ getInterpolatedPositionByIndex(idx, alpha)   │
│      └─ pos = prev + (curr - prev) * alpha           │
│                                                      │
│   3. Draw entities                                   │
│      └─ DrawStrategies.Player(ctx, entity, x, y)     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 6. System Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY GRAPH                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   world.input ───► MovementSystem ───► world.physics                         │
│                                              │                               │
│                                              ▼                               │
│   world.stateFlags ◄── PhysicsSystem ───► world.transform                    │
│                                              │                               │
│                                              ▼                               │
│   world.skill ◄──── SkillSystem ───► eventBuffer (VFX)                       │
│                          │                                                   │
│                          ▼                                                   │
│   ┌────────────────────────────────────────────────────────┐                │
│   │                  CJR SYSTEMS                            │                │
│   │                                                         │                │
│   │   colorMath ←─── ringSystem ←─── winCondition           │                │
│   │       │              │               │                  │                │
│   │       ▼              ▼               ▼                  │                │
│   │  world.pigment  world.stats     state.result            │                │
│   │                                                         │                │
│   │   tattoos ←─── bossCjr ←─── waveSpawner                 │                │
│   │       │            │              │                     │                │
│   │       ▼            ▼              ▼                     │                │
│   │  world.tattoo  bossState     food entities              │                │
│   │                                                         │                │
│   └────────────────────────────────────────────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Adding a New System

### Step-by-Step Guide

1. **Create System File:**
```typescript
// packages/engine/src/systems/MyNewSystem.ts

import type { WorldState } from '../generated/WorldState';
import { STRIDES } from '../generated/WorldState';

export class MyNewSystem {
  static update(world: WorldState, dt: number) {
    // Use Sparse Set for O(Active) iteration
    for (let i = 0; i < world.activeCount; i++) {
      const id = world.activeEntities[i];
      const idx = id * STRIDES.TRANSFORM;

      // Read from DOD arrays
      const x = world.transform[idx];
      const y = world.transform[idx + 1];

      // System logic here...

      // Write to DOD arrays
      world.myStore[id] = result;
    }
  }
}
```

2. **Export from Index:**
```typescript
// packages/engine/src/systems/index.ts
export { MyNewSystem } from './MyNewSystem';
```

3. **Add to Update Loop:**
```typescript
// In CJRClientRunner.updateEntities()
MyNewSystem.update(world, dt);
```

4. **If System Needs Component:**
```typescript
// packages/engine/src/generated/ComponentAccessors.ts
// Add new Access class (or register via ComponentRegistry)

export class MyAccess {
  static readonly STRIDE = 4;

  static set(world: WorldState, id: number, a: number, b: number) {
    const idx = id * MyAccess.STRIDE;
    world.myStore[idx] = a;
    world.myStore[idx + 1] = b;
  }

  static getA(world: WorldState, id: number): number {
    return world.myStore[id * MyAccess.STRIDE];
  }
}
```

---

## 8. Data Authority Summary

| Data | DOD Array | Access Class | Read By | Write By |
|------|-----------|--------------|---------|----------|
| Position | `world.transform` | `TransformAccess` | Renderer, Physics | PhysicsSystem |
| Velocity | `world.physics` | `PhysicsAccess` | PhysicsSystem | MovementSystem |
| Health/Score | `world.stats` | `StatsAccess` | UI, Combat | Combat |
| Input Target | `world.input` | `InputAccess` | MovementSystem | BufferedInput |
| Entity Flags | `world.stateFlags` | `StateAccess` | All Systems | Lifecycle |
| Pigment/Color | `world.pigment` | `PigmentAccess` | ColorMath, Render | Combat |
| Skill Cooldowns | `world.skill` | `SkillAccess` | SkillSystem | SkillSystem |
| Tattoos | `world.tattoo` | `TattooAccess` | TattooSystem | Upgrade |

---

**End of Document**
