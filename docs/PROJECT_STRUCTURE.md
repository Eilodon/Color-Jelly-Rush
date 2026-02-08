# Color Jelly Rush - Project Structure

> **Last Updated:** February 8, 2026
> **Purpose:** Complete reference for project folder organization

---

## Quick Navigation

```
Color-Jelly-Rush/
├── apps/                    # Applications (client & server)
│   ├── client/              # React + Canvas/Pixi.js game client
│   └── server/              # Colyseus multiplayer server
├── packages/                # Shared packages (monorepo)
│   ├── engine/              # @cjr/engine - Core game logic (headless)
│   ├── shared/              # @cjr/shared - Types & constants
│   └── ui/                  # @cjr/ui - Shared UI components
├── tests/                   # Test suites
├── infrastructure/          # Terraform AWS configs
├── k8s/                     # Kubernetes manifests
└── docs/                    # Documentation
```

---

## 1. Apps Directory

### 1.1 Client (`apps/client/`)

```
apps/client/
├── public/                          # Static assets
├── src/
│   ├── index.tsx                    # Entry point
│   ├── App.tsx                      # Root component
│   ├── constants.ts                 # Client-specific constants
│   │
│   ├── components/                  # React UI Components
│   │   ├── screens/                 # Full-screen views
│   │   │   ├── BootScreen.tsx
│   │   │   ├── MatchmakingScreen.tsx
│   │   │   ├── LevelSelectScreen.tsx
│   │   │   ├── GameOverScreen.tsx
│   │   │   └── TournamentLobbyScreen.tsx
│   │   ├── overlays/                # Modal/popup overlays
│   │   │   ├── PauseOverlay.tsx
│   │   │   ├── TutorialOverlay.tsx
│   │   │   └── SettingsOverlay.tsx
│   │   ├── ScreenManager.tsx
│   │   ├── UiOverlayManager.tsx
│   │   ├── HUD.tsx
│   │   ├── MainMenu.tsx
│   │   ├── MobileControls.tsx
│   │   ├── GameCanvas.tsx           # Canvas2D renderer
│   │   ├── PixiGameCanvas.tsx       # Pixi.js canvas wrapper
│   │   ├── TattooPicker.tsx
│   │   └── ColorblindOverlay.tsx
│   │
│   ├── hooks/                       # React Custom Hooks
│   │   ├── useGameSession.ts        # Game session lifecycle
│   │   ├── useGameDataBridge.ts     # Engine ↔ React bridge
│   │   ├── useZeroRenderTimer.ts    # Performance timer
│   │   ├── useReducedMotion.ts      # Accessibility
│   │   └── useScreenReaderAnnouncer.ts
│   │
│   ├── game/                        # Game Logic (Client-side)
│   │   ├── engine/                  # Client engine integration
│   │   │   ├── GameStateManager.ts  # Session orchestration
│   │   │   ├── GameLoop.ts          # RAF loop
│   │   │   ├── ClientEngineBridge.ts
│   │   │   ├── RenderBridge.ts
│   │   │   ├── VFXRingBuffer.ts
│   │   │   ├── PhysicsWorld.ts
│   │   │   ├── WorkerSimulation.ts  # Web Worker integration
│   │   │   ├── factories.ts
│   │   │   ├── effects.ts
│   │   │   ├── statusFlags.ts
│   │   │   ├── context.ts           # getWorld() accessor
│   │   │   ├── index.ts
│   │   │   │
│   │   │   ├── runner/              # Game Runner
│   │   │   │   ├── CJRClientRunner.ts  # Main game runner
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── dod/                 # Client DOD layer
│   │   │   │   ├── EntityManager.ts
│   │   │   │   ├── EntityFlags.ts
│   │   │   │   ├── ConfigStore.ts
│   │   │   │   ├── EntityStateBridge.ts
│   │   │   │   ├── DODViewHelpers.ts
│   │   │   │   └── systems/
│   │   │   │       ├── AISystem.ts      # Bot AI (DOD)
│   │   │   │       └── TattooSystem.ts
│   │   │   │
│   │   │   └── systems/             # Client-specific systems
│   │   │       ├── combat.ts
│   │   │       ├── mechanics.ts
│   │   │       ├── AudioSyncSystem.ts
│   │   │       ├── InputSystem.ts
│   │   │       ├── NetworkSync.ts
│   │   │       ├── PhysicsCoordinator.ts
│   │   │       ├── SessionManager.ts
│   │   │       └── VisualSystem.ts
│   │   │
│   │   ├── cjr/                     # CJR Game Mechanics
│   │   │   ├── cjrTypes.ts          # CJR type definitions
│   │   │   ├── tattoos.ts           # Tattoo definitions
│   │   │   ├── tattooSynergies.ts   # Synergy system
│   │   │   ├── emotions.ts          # Emotion system
│   │   │   ├── levels.ts            # Level configurations
│   │   │   ├── balance.ts           # Balance parameters
│   │   │   ├── contribution.ts      # Contribution tier system
│   │   │   ├── botPersonalities.ts  # AI personalities
│   │   │   ├── colorMath.ts         # Color math (re-exports)
│   │   │   └── shaders.ts           # GLSL shaders
│   │   │
│   │   ├── renderer/                # Rendering System
│   │   │   ├── RingRenderer.ts
│   │   │   ├── RenderTypes.ts
│   │   │   ├── WebGLCheck.ts
│   │   │   └── backends/            # Render backend abstraction
│   │   │       ├── IRenderBackend.ts
│   │   │       ├── WebGL2Backend.ts
│   │   │       ├── WebGPUBackend.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── visuals/                 # Visual Effects
│   │   │   └── JuiceSystem.ts
│   │   │
│   │   ├── vfx/                     # VFX Integration
│   │   │   ├── vfxIntegration.ts
│   │   │   ├── CrystalVFX.ts
│   │   │   └── tattooVFX.ts
│   │   │
│   │   ├── audio/                   # Audio System
│   │   │   └── AudioEngine.ts
│   │   │
│   │   ├── input/                   # Input Handling
│   │   │   └── BufferedInput.ts
│   │   │
│   │   ├── math/                    # Client Math Utils
│   │   │   └── FastMath.ts
│   │   │
│   │   ├── spatial/                 # Spatial Queries
│   │   │   └── SpatialHashGrid.ts
│   │   │
│   │   ├── mobile/                  # Mobile Optimization
│   │   │   └── MobileOptimizer.ts
│   │   │
│   │   ├── pooling/                 # Object Pooling
│   │   │   └── ObjectPool.ts
│   │   │
│   │   ├── logging/                 # Client Logging
│   │   │   └── ClientLogger.ts
│   │   │
│   │   └── __tests__/
│   │
│   ├── network/                     # Networking
│   │   ├── NetworkClient.ts
│   │   ├── BinaryPacker.ts
│   │   ├── InputRingBuffer.ts
│   │   ├── NetworkTransformBuffer.ts
│   │   └── __tests__/
│   │
│   ├── core/                        # Cross-cutting Concerns
│   │   ├── ui/                      # UI utilities
│   │   ├── performance/
│   │   ├── logging/
│   │   ├── analytics/
│   │   ├── monetization/
│   │   ├── accessibility/
│   │   ├── security/
│   │   ├── utils/
│   │   └── meta/                    # Meta-game systems
│   │       ├── index.ts
│   │       ├── matchmaking.ts
│   │       ├── tournaments.ts
│   │       ├── guilds.ts
│   │       ├── quests.ts
│   │       └── cosmetics.ts
│   │
│   └── types/                       # TypeScript Definitions
│
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

### 1.2 Server (`apps/server/`)

```
apps/server/
├── src/
│   ├── index.ts                     # Server entry point
│   ├── constants.ts
│   ├── cjrTypes.ts
│   │
│   ├── rooms/                       # Colyseus Rooms
│   │   ├── GameRoom.ts              # Main game room (authoritative)
│   │   └── GameRoom.test.ts
│   │
│   ├── schema/                      # Colyseus Schema
│   │   └── GameState.ts             # Sync state schema
│   │
│   ├── engine/                      # Server Engine
│   │   └── ServerEngineBridge.ts
│   │
│   ├── systems/                     # Server-side Systems
│   │   └── ColorMixingSystem.ts
│   │
│   ├── auth/                        # Authentication
│   ├── security/                    # Security Layer
│   ├── validation/                  # Input Validation
│   ├── database/                    # Database Layer
│   ├── monitoring/                  # Server Monitoring
│   ├── performance/
│   ├── logging/
│   └── testing/
│
├── tsconfig.json
└── package.json
```

---

## 2. Packages Directory

### 2.1 Engine Package (`packages/engine/`)

> **Package Name:** `@cjr/engine`
> **Purpose:** Headless, pure game logic (runs on client AND server)

```
packages/engine/
├── src/
│   ├── index.ts                     # Public API exports
│   ├── compat.ts                    # Legacy compatibility layer
│   │
│   ├── core/                        # Core Infrastructure
│   │   ├── index.ts
│   │   ├── BaseSimulation.ts        # Abstract simulation class
│   │   ├── ComponentRegistry.ts     # Dynamic component registration
│   │   ├── CoreRegistry.ts          # Core module registry
│   │   └── IEntityLookup.ts         # Entity lookup interface
│   │
│   ├── generated/                   # Code-generated Files
│   │   ├── index.ts
│   │   ├── WorldState.ts            # WorldState class (instance-based)
│   │   ├── ComponentAccessors.ts    # TransformAccess, PhysicsAccess, etc.
│   │   ├── NetworkDeserializer.ts
│   │   └── NetworkPacker.ts
│   │
│   ├── interfaces/                  # Type Interfaces
│   │   ├── IComponent.ts
│   │   ├── IModule.ts
│   │   ├── ISystem.ts
│   │   ├── IWorld.ts
│   │   └── index.ts
│   │
│   ├── loader/                      # Entity Loading
│   │   ├── index.ts
│   │   ├── BlueprintLoader.ts       # Level blueprint loader
│   │   ├── EntitySpawner.ts         # Entity spawning
│   │   └── LevelValidator.ts        # Level validation
│   │
│   ├── systems/                     # Pure System Functions
│   │   ├── index.ts
│   │   ├── PhysicsSystem.ts
│   │   ├── MovementSystem.ts
│   │   └── SkillSystem.ts
│   │
│   ├── modules/                     # Game Modules
│   │   ├── index.ts
│   │   └── cjr/                     # CJR Module
│   │       ├── index.ts
│   │       ├── CJRModule.ts         # Module registration
│   │       ├── colorMath.ts         # Color mixing/matching
│   │       ├── ringSystem.ts        # Ring progression
│   │       ├── waveSpawner.ts       # Entity spawning
│   │       ├── winCondition.ts      # Victory logic
│   │       ├── bossCjr.ts           # Boss mechanics
│   │       └── tattoos.ts           # Tattoo upgrades
│   │
│   ├── events/                      # Event System
│   │   ├── index.ts
│   │   └── EventRingBuffer.ts       # Zero-alloc events
│   │
│   ├── config/                      # Configuration
│   │   ├── index.ts
│   │   ├── levels.ts
│   │   └── constants.ts
│   │
│   ├── math/                        # Math Utilities
│   │   ├── index.ts
│   │   └── FastMath.ts
│   │
│   ├── factories/                   # Entity Factories
│   │   ├── index.ts
│   │   └── LogicFactories.ts
│   │
│   ├── networking/                  # Binary Protocol
│   │   ├── index.ts
│   │   ├── BinaryPacker.ts
│   │   └── types.ts
│   │
│   ├── client/                      # Client-specific exports
│   │   └── index.ts
│   │
│   └── __tests__/
│       ├── DODStores.test.ts
│       ├── PhysicsSystem.test.ts
│       └── EventRingBuffer.test.ts
│
├── scripts/
│   └── generate.js                  # Code generator
│
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

### 2.2 Shared Package (`packages/shared/`)

> **Package Name:** `@cjr/shared`
> **Purpose:** Types and constants shared between client/server

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── engine/
│   │   └── types.ts
│   └── config/
│       └── PhysicsConfig.ts
│
├── tsconfig.json
└── package.json
```

---

## 3. Tests Directory

```
tests/
├── integration/                     # Integration tests
│   ├── physicsAccuracy.test.ts
│   └── clientServerSync.test.ts
├── performance/                     # Load & perf tests
└── e2e/                            # Playwright E2E tests
```

---

## 4. Infrastructure

### 4.1 Kubernetes (`k8s/`)

```
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── hpa.yaml
├── overlays/
│   ├── staging/
│   └── production/
└── kustomization.yaml
```

### 4.2 Terraform (`infrastructure/`)

```
infrastructure/
└── terraform/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

---

## 5. Key Architecture Changes (Feb 2026)

| Before (Feb 2) | After (Feb 8) | Notes |
|----------------|---------------|-------|
| `TransformStore` class | `TransformAccess` static methods | Legacy wrappers in `compat.ts` |
| Global stores | Instance-based `WorldState` | `getWorld()` accessor |
| `dod/ComponentStores.ts` | `generated/ComponentAccessors.ts` | Code-generated |
| `ai.ts` system | `dod/systems/AISystem.ts` class | Proper DOD integration |
| N/A | `runner/CJRClientRunner.ts` | Game loop runner |
| N/A | `core/ComponentRegistry.ts` | Dynamic registration |
| N/A | `loader/EntitySpawner.ts` | Entity lifecycle |

---

## 6. Module Ownership

| Directory | Responsibility |
|-----------|----------------|
| `apps/client/src/components/` | React UI components |
| `apps/client/src/game/engine/` | Client engine integration |
| `apps/client/src/game/cjr/` | CJR game mechanics |
| `apps/server/src/rooms/` | Multiplayer rooms |
| `packages/engine/` | Core headless engine |
| `packages/engine/generated/` | Code-generated (DO NOT EDIT) |
| `packages/shared/` | Shared contracts |

---

## 7. File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| React Component | `PascalCase.tsx` | `GameCanvas.tsx` |
| React Hook | `useCamelCase.ts` | `useGameSession.ts` |
| System Class | `PascalCaseSystem.ts` | `AISystem.ts` |
| Access Class | `PascalCaseAccess` | `TransformAccess` |
| Types | `camelCase.ts` | `cjrTypes.ts` |
| Tests | `*.test.ts` | `PhysicsSystem.test.ts` |
| Generated | `PascalCase.ts` | In `generated/` folder |

---

**End of Document**
