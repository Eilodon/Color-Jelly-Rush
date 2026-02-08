# Color Jelly Rush - Module Dependency Map

> **Last Updated:** February 8, 2026
> **Purpose:** Visual guide to module dependencies and import paths

---

## 1. High-Level Architecture

```
                              ┌─────────────────────────────────────┐
                              │           APPLICATIONS              │
                              └─────────────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      │                      ▼
    ┌───────────────────────┐              │      ┌───────────────────────┐
    │    apps/client        │              │      │    apps/server        │
    │    (React + Canvas/   │              │      │    (Express+Colyseus) │
    │     Pixi.js)          │              │      └───────────────────────┘
    └───────────────────────┘              │                      │
                │                          │                      │
                │                          │                      │
                └──────────────────────────┼──────────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                              ▼                         ▼
                ┌─────────────────────┐   ┌─────────────────────┐
                │   @cjr/engine       │   │   @cjr/shared       │
                │   (Game Logic)      │   │   (Types/Constants) │
                └─────────────────────┘   └─────────────────────┘
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │   External Libraries    │
                              │   (Pixi.js, Colyseus)   │
                              └─────────────────────────┘
```

---

## 2. Package Dependencies

### 2.1 Dependency Matrix

| Package | Depends On | Used By |
|---------|------------|---------|
| `@cjr/shared` | None (leaf) | `@cjr/engine`, `apps/client`, `apps/server` |
| `@cjr/engine` | `@cjr/shared` | `apps/client`, `apps/server` |
| `apps/client` | `@cjr/shared`, `@cjr/engine`, `pixi.js`, `colyseus.js`, `react` | - |
| `apps/server` | `@cjr/shared`, `@cjr/engine`, `colyseus`, `express`, `pg`, `redis` | - |

### 2.2 Import Direction Rules

```
     ALLOWED                          FORBIDDEN
     ========                          =========

  ┌─────────────┐                   ┌─────────────┐
  │ apps/client │                   │ apps/client │
  └──────┬──────┘                   └──────┬──────┘
         │                                 ▲
         │ ✅ Can import                   │ ❌ Cannot import
         ▼                                 │
  ┌─────────────┐                   ┌──────┴──────┐
  │ @cjr/engine │                   │ @cjr/engine │
  └──────┬──────┘                   └─────────────┘
         │
         │ ✅ Can import
         ▼
  ┌─────────────┐
  │ @cjr/shared │  ← Leaf node, no outgoing deps
  └─────────────┘
```

---

## 3. Client Application Module Map

```
apps/client/src/
│
├── index.tsx ◄────────────────────── ENTRY POINT
│       │
│       └─► App.tsx
│               │
│               ├─► components/ScreenManager.tsx
│               │       │
│               │       ├─► screens/BootScreen.tsx
│               │       ├─► screens/MatchmakingScreen.tsx
│               │       └─► screens/GameOverScreen.tsx
│               │
│               ├─► components/GameCanvas.tsx
│               │       │
│               │       └─► game/renderer/backends/*
│               │
│               └─► hooks/useGameSession.ts
│                       │
│                       └─► game/engine/GameStateManager.ts
│                               │
│                               ├─► game/engine/runner/CJRClientRunner.ts
│                               ├─► game/engine/ClientEngineBridge.ts
│                               │       │
│                               │       └─► @cjr/engine (WorldState, Systems)
│                               │
│                               └─► network/*
```

### 3.1 Client Module Categories

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  components/screens/*     │ Full-screen views                       │
│  components/overlays/*    │ Modal popups                            │
│  components/HUD.tsx       │ In-game UI                              │
│  components/*.tsx         │ Reusable UI components                  │
├─────────────────────────────────────────────────────────────────────┤
│                           HOOKS LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  hooks/useGameSession.ts       │ Session lifecycle                  │
│  hooks/useGameDataBridge.ts    │ Engine ↔ React bridge              │
│  hooks/useZeroRenderTimer.ts   │ Performance-safe timers            │
├─────────────────────────────────────────────────────────────────────┤
│                          GAME ENGINE LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  game/engine/GameStateManager.ts  │ Session orchestrator            │
│  game/engine/GameLoop.ts          │ RAF loop                        │
│  game/engine/ClientEngineBridge.ts│ Links to @cjr/engine            │
│  game/engine/runner/CJRClientRunner│ Main game runner               │
│  game/engine/context.ts           │ getWorld() accessor             │
│  game/engine/dod/*                │ Client DOD layer                │
│  game/engine/dod/systems/         │ AISystem, TattooSystem          │
│  game/engine/systems/             │ combat, mechanics, etc.         │
├─────────────────────────────────────────────────────────────────────┤
│                         CJR MECHANICS LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│  game/cjr/tattoos.ts           │ Tattoo definitions                 │
│  game/cjr/tattooSynergies.ts   │ Synergy system                     │
│  game/cjr/emotions.ts          │ Emotion system                     │
│  game/cjr/contribution.ts      │ Boss contribution tiers            │
│  game/cjr/botPersonalities.ts  │ Bot AI personalities               │
├─────────────────────────────────────────────────────────────────────┤
│                          RENDERING LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│  game/renderer/backends/       │ Render backend abstraction         │
│  game/vfx/*                    │ Visual effects system              │
│  game/visuals/JuiceSystem.ts   │ Game juice effects                 │
├─────────────────────────────────────────────────────────────────────┤
│                          NETWORK LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  network/NetworkClient.ts      │ Colyseus client wrapper            │
│  network/BinaryPacker.ts       │ Binary message encoding            │
│  network/InputRingBuffer.ts    │ Input buffering                    │
│  network/NetworkTransformBuffer│ Position interpolation             │
├─────────────────────────────────────────────────────────────────────┤
│                           CORE LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  core/analytics/*              │ Telemetry                          │
│  core/accessibility/*          │ A11y features                      │
│  core/security/*               │ Client security                    │
│  core/meta/*                   │ Meta-game systems                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Server Application Module Map

```
apps/server/src/
│
├── index.ts ◄────────────────────── ENTRY POINT
│       │
│       ├─► Express + Helmet (security headers)
│       ├─► Colyseus Server
│       │       │
│       │       └─► rooms/GameRoom.ts
│       │               │
│       │               ├─► @cjr/engine (WorldState, Access classes)
│       │               │       │
│       │               │       ├─► TransformAccess
│       │               │       ├─► PhysicsAccess
│       │               │       └─► PhysicsSystem, MovementSystem
│       │               │
│       │               ├─► schema/GameState.ts (Colyseus Schema)
│       │               └─► systems/ColorMixingSystem.ts
│       │
│       ├─► auth/authRoutes.ts
│       │       │
│       │       ├─► auth/AuthService.ts
│       │       └─► auth/SessionStore.ts (Redis)
│       │
│       ├─► monitoring/monitoringRoutes.ts
│       │
│       └─► database/*
│               │
│               ├─► PostgreSQLManager.ts
│               └─► RedisManager.ts
```

---

## 5. Engine Package Module Map

```
@cjr/engine (packages/engine/src/)
│
├── index.ts ◄────────────────────── PUBLIC API
│       │
│       ├─► generated/             ← CODE-GENERATED (DO NOT EDIT)
│       │   ├── index.ts
│       │   ├── WorldState.ts      ← Instance-based world state
│       │   ├── ComponentAccessors.ts ← TransformAccess, PhysicsAccess, etc.
│       │   ├── NetworkPacker.ts   ← Binary serialization
│       │   └── NetworkDeserializer.ts
│       │
│       ├─► core/                  ← INFRASTRUCTURE
│       │   ├── index.ts
│       │   ├── BaseSimulation.ts  ← Abstract simulation class
│       │   ├── ComponentRegistry.ts ← Dynamic component registration
│       │   ├── CoreRegistry.ts    ← Core module registry
│       │   └── IEntityLookup.ts   ← Entity lookup interface
│       │
│       ├─► interfaces/            ← CONTRACTS
│       │   ├── IComponent.ts
│       │   ├── IModule.ts
│       │   ├── ISystem.ts
│       │   ├── IWorld.ts
│       │   └── index.ts
│       │
│       ├─► systems/               ← PURE DOD SYSTEMS
│       │   ├── index.ts
│       │   ├── PhysicsSystem.ts   ← Position updates
│       │   ├── MovementSystem.ts  ← Velocity from input
│       │   └── SkillSystem.ts     ← Skill execution
│       │
│       ├─► modules/               ← GAME MODULES
│       │   ├── index.ts
│       │   └── cjr/               ← CJR MODULE
│       │       ├── index.ts       ← Module exports
│       │       ├── CJRModule.ts   ← IGameModule implementation
│       │       ├── colorMath.ts   ← Color mixing/matching
│       │       ├── ringSystem.ts  ← Ring progression
│       │       ├── waveSpawner.ts ← Entity spawning
│       │       ├── winCondition.ts← Victory check
│       │       ├── bossCjr.ts     ← Boss mechanics
│       │       ├── tattoos.ts     ← Upgrade system
│       │       ├── constants.ts   ← CJR constants
│       │       ├── flags.ts       ← CJR-specific flags
│       │       ├── state.ts       ← State interfaces
│       │       └── types.ts       ← Type definitions
│       │
│       ├─► loader/                ← ENTITY LOADING
│       │   ├── index.ts
│       │   ├── BlueprintLoader.ts ← Level blueprint loader
│       │   ├── EntitySpawner.ts   ← Entity spawning
│       │   └── LevelValidator.ts  ← Level validation
│       │
│       ├─► events/                ← EVENT SYSTEM
│       │   ├── index.ts
│       │   └── EventRingBuffer.ts ← Zero-alloc event queue
│       │
│       ├─► config/                ← CONFIGURATION
│       │   ├── index.ts
│       │   ├── levels.ts          ← Level configurations
│       │   └── constants.ts
│       │
│       ├─► math/                  ← MATH UTILITIES
│       │   ├── index.ts
│       │   └── FastMath.ts        ← Optimized math utils
│       │
│       ├─► networking/            ← BINARY PROTOCOL
│       │   ├── index.ts
│       │   ├── BinaryPacker.ts    ← Binary protocol
│       │   └── types.ts
│       │
│       ├─► factories/             ← ENTITY CREATION
│       │   ├── index.ts
│       │   └── LogicFactories.ts  ← createLogicEntity
│       │
│       └─► compat.ts              ← LEGACY COMPATIBILITY
│           ├── TransformStore     ← DEPRECATED → TransformAccess
│           ├── PhysicsStore       ← DEPRECATED → PhysicsAccess
│           └── resetAllStores     ← DEPRECATED → world.reset()
```

---

## 6. Shared Package Module Map

```
@cjr/shared (packages/shared/src/)
│
├── index.ts ◄────────────────────── PUBLIC API
│       │
│       ├─► constants.ts      ← Game-wide constants
│       ├─► types.ts          ← Core type definitions
│       │
│       ├─► engine/
│       │   └── types.ts      ← Engine-specific types
│       │
│       └─► config/
│           └── PhysicsConfig.ts  ← Physics parameters
```

---

## 7. Cross-Package Imports

### 7.1 From Client

```typescript
// Importing from @cjr/engine
import {
  // Generated (primary source)
  WorldState,
  TransformAccess,
  PhysicsAccess,
  MAX_ENTITIES,
  STRIDES,

  // Core
  getComponentRegistry,

  // Systems
  PhysicsSystem,
  MovementSystem,

  // Events
  eventBuffer,
  EngineEventType,

  // CJR Module
  mixPigment,
  calcMatchPercent,
  getRingAtPosition,
  cjrModule,
} from '@cjr/engine';

// Importing from @cjr/shared
import {
  MAX_PLAYERS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  EntityType,
  SkillType
} from '@cjr/shared';

// Internal aliases
import { GameStateManager } from '@/game/engine/GameStateManager';
import { getWorld } from '@/game/engine/context';
import { HUD } from '@components/HUD';
```

### 7.2 From Server

```typescript
// Importing from @cjr/engine
import {
  WorldState,
  TransformAccess,
  PhysicsAccess,
  PhysicsSystem,
  MovementSystem,
  STRIDES,
} from '@cjr/engine';

// Importing from @cjr/shared
import {
  GameConfig,
  EntityType
} from '@cjr/shared';
```

---

## 8. Circular Dependency Prevention

### 8.1 Forbidden Patterns

```
❌ apps/client → apps/server
❌ @cjr/engine → apps/*
❌ @cjr/shared → @cjr/engine
❌ @cjr/shared → apps/*
```

### 8.2 Detection

Run ESLint with import-cycle detection:
```bash
npm run lint -- --rule 'import/no-cycle: error'
```

---

## 9. Module Export Rules

### @cjr/engine Exports

| Module | What to Export | What NOT to Export |
|--------|----------------|-------------------|
| `generated/` | WorldState, Access classes, STRIDES | Internal buffers |
| `core/` | ComponentRegistry, getComponentRegistry | Internal state |
| `systems/` | System update functions | Internal helpers |
| `modules/cjr/` | Public game logic, CJRModule | Implementation details |
| `events/` | eventBuffer, EventTypes | Buffer internals |
| `loader/` | EntitySpawner, BlueprintLoader | Internal parsers |

### @cjr/shared Exports

| Module | What to Export |
|--------|----------------|
| `constants.ts` | All constants |
| `types.ts` | All type definitions |

---

## 10. Key Changes (Feb 2026)

| Before (Feb 2) | After (Feb 8) | Import Path |
|----------------|---------------|-------------|
| `TransformStore` | `TransformAccess` | `@cjr/engine` |
| `PhysicsStore` | `PhysicsAccess` | `@cjr/engine` |
| `dod/ComponentStores.ts` | `generated/ComponentAccessors.ts` | `@cjr/engine` |
| `cjr/*.ts` | `modules/cjr/*.ts` | `@cjr/engine` |
| Global `defaultWorld` | `getWorld()` accessor | Context file |
| N/A | `CJRModule` class | `@cjr/engine` |
| N/A | `ComponentRegistry` | `@cjr/engine` |
| N/A | `EntitySpawner` | `@cjr/engine` |

---

**End of Document**
