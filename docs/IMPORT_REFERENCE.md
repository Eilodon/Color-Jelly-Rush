# Color Jelly Rush - Import Reference Guide

> **Last Updated:** February 8, 2026
> **Purpose:** Definitive guide for correct import paths after refactoring

---

## 1. Quick Reference Table

| What You Need | Import From | Example |
|---------------|-------------|---------|
| WorldState, Access Classes | `@cjr/engine` | `import { WorldState, TransformAccess } from '@cjr/engine'` |
| Core Systems | `@cjr/engine` | `import { PhysicsSystem } from '@cjr/engine'` |
| CJR Game Logic | `@cjr/engine` | `import { mixPigment, cjrModule } from '@cjr/engine'` |
| Shared Types | `@cjr/shared` | `import { EntityType } from '@cjr/shared'` |
| Shared Constants | `@cjr/shared` | `import { MAX_PLAYERS } from '@cjr/shared'` |
| Local Components | `@/components/*` | `import { HUD } from '@/components/HUD'` |
| Local Hooks | `@/hooks/*` | `import { useGameSession } from '@/hooks/useGameSession'` |
| Game Engine | `@/game/engine/*` | `import { GameStateManager } from '@/game/engine/GameStateManager'` |

---

## 2. Package Imports

### 2.1 From `@cjr/engine` - Generated Module (Primary)

```typescript
// === WorldState & Access Classes (generated/) ===
import {
  // WorldState
  WorldState,
  MAX_ENTITIES,
  STRIDES,
  defaultWorld,      // Singleton (prefer getWorld())
  type IWorldConfig,
  type IWorldBuffers,

  // Component Access Classes (static methods)
  StateAccess,       // Entity flags
  TransformAccess,   // Position, rotation, scale
  PhysicsAccess,     // Velocity, mass, radius
  PigmentAccess,     // Color (r, g, b)
  StatsAccess,       // Health, score, match%
  InputAccess,       // Target position, skill flag
  SkillAccess,       // Cooldowns, shape ID
  ConfigAccess,      // Speed multiplier, etc.
  ProjectileAccess,  // Projectile data
  TattooAccess,      // Tattoo flags

  // Network
  NetworkSerializer,
  NetworkDeserializer,
  COMPONENT_IDS,
  COMPONENT_STRIDES,
} from '@cjr/engine';
```

### 2.2 From `@cjr/engine` - Core Module

```typescript
// === Core Infrastructure ===
import {
  // Component Registry
  ComponentRegistry,
  getComponentRegistry,
  type IRegisteredStore,
  type TypedArray,

  // Entity Lookup
  type IEntityLookup,
  createArrayLookup,
  createMapLookup,
} from '@cjr/engine';
```

### 2.3 From `@cjr/engine` - Systems Module

```typescript
// === Pure DOD Systems ===
import {
  PhysicsSystem,
  MovementSystem,
  SkillSystem,
  ShapeEnum,
} from '@cjr/engine';
```

### 2.4 From `@cjr/engine` - CJR Module

```typescript
// === CJR Game Module ===
import {
  // Module Class
  CJRModule,
  cjrModule,           // Singleton instance
  createCJRModule,
  registerCJRComponents,

  // Color Math
  getColorHint,
  calcMatchPercent,
  calcMatchPercentFast,
  mixPigment,
  pigmentToInt,
  pigmentToHex,
  hexToInt,
  intToHex,
  intToRgbString,
  getSnapAlpha,

  // Ring System
  getRingAtPosition,
  updateRingLogic,
  updateRingLogicLegacy,
  checkRingTransition,
  type IRingEntity,

  // Tattoos
  getTattooById,
  applyTattoo,
  triggerTattooOnSkill,
  triggerTattooOnHit,
  triggerTattooOnConsume,
  triggerTattooOnUpdate,
  getTattooChoices,
  getAllTattoos,
  TattooFlag,
  StatusFlag,
  type TattooDefinition,
  type TattooChoice,
  type ITattooEntity,

  // Win Condition
  updateWinConditionLogic,
  updateWinCondition,
  type IWinEntity,
  type IWinState,
  type ILevelConfig,

  // Boss Logic
  updateBossLogic,
  resetBossState,
  isRushWindowActive,
  getRushThreshold,
  onBossDeath,
  type IBossEntity,
  type IPlayerEntity,
  type IBossState,

  // Wave Spawner
  updateWaveSpawner,
  resetWaveTimers,
  spawnFoodAt,
  type IFood,
  type IWaveState,
  type ISpawnResult,

  // CJR Types & Flags
  CJRFlags,          // CJR-specific entity flags
  type Pigment,
} from '@cjr/engine';
```

### 2.5 From `@cjr/engine` - Other Modules

```typescript
// === Events Module ===
import {
  eventBuffer,
  EventRingBuffer,
  EngineEventType,
  type EngineEvent,
} from '@cjr/engine';

// === Config Module ===
import {
  getLevelConfig,
  PHYSICS_CONSTANTS,
} from '@cjr/engine';

// === Math Module ===
import {
  FastMath,
} from '@cjr/engine';

// === Networking Module ===
import {
  BinaryPacker,
  type PackedInput,
} from '@cjr/engine';

// === Loader Module ===
import {
  EntitySpawner,
  BlueprintLoader,
  LevelValidator,
} from '@cjr/engine';

// === Factories Module ===
import {
  createLogicEntity,
} from '@cjr/engine';
```

### 2.6 From `@cjr/engine` - Legacy (Deprecated)

```typescript
// === ⚠️ DEPRECATED: Legacy Store Wrappers (compat.ts) ===
// These log deprecation warnings in development mode
// Use Access classes instead

import {
  TransformStore,    // → Use TransformAccess
  PhysicsStore,      // → Use PhysicsAccess
  StatsStore,        // → Use StatsAccess
  resetAllStores,    // → Use world.reset()
} from '@cjr/engine';
```

### 2.7 From `@cjr/shared`

```typescript
import {
  // Types
  type EntityType,
  type SkillType,
  type ShapeId,
  type Vector2,

  // Constants
  MAX_PLAYERS,
  MAX_BOTS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TICK_RATE,

  // Config
  PhysicsConfig,
} from '@cjr/shared';
```

---

## 3. Client Application Imports

### 3.1 Path Aliases (Vite)

```typescript
// @/ → apps/client/src/
import { HUD } from '@/components/HUD';
import { useGameSession } from '@/hooks/useGameSession';
import { GameStateManager } from '@/game/engine/GameStateManager';

// @components/ → apps/client/src/components/
import { ScreenManager } from '@components/ScreenManager';
import { MainMenu } from '@components/MainMenu';
```

### 3.2 Component Imports

```typescript
// Screens
import { BootScreen } from '@/components/screens/BootScreen';
import { MatchmakingScreen } from '@/components/screens/MatchmakingScreen';
import { LevelSelectScreen } from '@/components/screens/LevelSelectScreen';
import { GameOverScreen } from '@/components/screens/GameOverScreen';
import { TournamentLobbyScreen } from '@/components/screens/TournamentLobbyScreen';

// Overlays
import { PauseOverlay } from '@/components/overlays/PauseOverlay';
import { TutorialOverlay } from '@/components/overlays/TutorialOverlay';
import { SettingsOverlay } from '@/components/overlays/SettingsOverlay';

// Core Components
import { ScreenManager } from '@/components/ScreenManager';
import { UiOverlayManager } from '@/components/UiOverlayManager';
import { HUD } from '@/components/HUD';
import { MainMenu } from '@/components/MainMenu';
import { GameCanvas } from '@/components/GameCanvas';
import { MobileControls } from '@/components/MobileControls';
import { PixiGameCanvas } from '@/components/PixiGameCanvas';
import { TattooPicker } from '@/components/TattooPicker';
import { ColorblindOverlay } from '@/components/ColorblindOverlay';
```

### 3.3 Hook Imports

```typescript
import { useGameSession } from '@/hooks/useGameSession';
import { useGameDataBridge } from '@/hooks/useGameDataBridge';
import { useZeroRenderTimer } from '@/hooks/useZeroRenderTimer';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScreenReaderAnnouncer } from '@/hooks/useScreenReaderAnnouncer';
```

### 3.4 Game Engine Imports

```typescript
// Engine Core
import { GameStateManager, gameStateManager } from '@/game/engine/GameStateManager';
import { FixedGameLoop } from '@/game/engine/GameLoop';
import { ClientEngineBridge } from '@/game/engine/ClientEngineBridge';
import { RenderBridge } from '@/game/engine/RenderBridge';
import { VFXRingBuffer } from '@/game/engine/VFXRingBuffer';
import { PhysicsWorld } from '@/game/engine/PhysicsWorld';
import { getWorld } from '@/game/engine/context';

// Game Runner
import { CJRClientRunner } from '@/game/engine/runner/CJRClientRunner';

// Client DOD
import { EntityManager } from '@/game/engine/dod/EntityManager';
import { EntityFlags } from '@/game/engine/dod/EntityFlags';
import { ConfigStore } from '@/game/engine/dod/ConfigStore';
import { EntityStateBridge } from '@/game/engine/dod/EntityStateBridge';
import { DODViewHelpers } from '@/game/engine/dod/DODViewHelpers';

// Client DOD Systems
import { AISystem } from '@/game/engine/dod/systems/AISystem';
import { TattooSystem } from '@/game/engine/dod/systems/TattooSystem';

// Client Systems
import { combat } from '@/game/engine/systems/combat';
import { mechanics } from '@/game/engine/systems/mechanics';
import { AudioSyncSystem } from '@/game/engine/systems/AudioSyncSystem';
import { InputSystem } from '@/game/engine/systems/InputSystem';
import { NetworkSync } from '@/game/engine/systems/NetworkSync';
import { PhysicsCoordinator } from '@/game/engine/systems/PhysicsCoordinator';
import { SessionManager } from '@/game/engine/systems/SessionManager';
import { VisualSystem } from '@/game/engine/systems/VisualSystem';
```

### 3.5 CJR Mechanics Imports

```typescript
// Types
import { ShapeId, Emotion, TattooId } from '@/game/cjr/cjrTypes';

// Tattoos
import { TATTOO_DEFINITIONS, getTattooDefinition } from '@/game/cjr/tattoos';
import { checkTattooSynergies } from '@/game/cjr/tattooSynergies';

// Emotions
import { EMOTIONS, getEmotion, updateEmotion } from '@/game/cjr/emotions';

// Levels
import { LEVEL_CONFIGS, getLevelConfig } from '@/game/cjr/levels';

// Balance
import { BALANCE } from '@/game/cjr/balance';

// Contribution
import { calculateContribution, getContributionTier } from '@/game/cjr/contribution';

// Bot AI
import { BOT_PERSONALITIES, getBotPersonality } from '@/game/cjr/botPersonalities';

// Shaders
import { SHADERS, compileShader } from '@/game/cjr/shaders';
```

### 3.6 Renderer Imports

```typescript
import { RingRenderer } from '@/game/renderer/RingRenderer';
import { RenderTypes } from '@/game/renderer/RenderTypes';
import { checkWebGLSupport } from '@/game/renderer/WebGLCheck';

// Backends
import { IRenderBackend } from '@/game/renderer/backends/IRenderBackend';
import { WebGL2Backend } from '@/game/renderer/backends/WebGL2Backend';
import { WebGPUBackend } from '@/game/renderer/backends/WebGPUBackend';
import { createRenderBackend } from '@/game/renderer/backends/index';
```

### 3.7 Other Client Imports

```typescript
// VFX
import { vfxIntegrationManager } from '@/game/vfx/vfxIntegration';
import { CrystalVFX } from '@/game/vfx/CrystalVFX';
import { TattooVFX } from '@/game/vfx/tattooVFX';

// Audio
import { AudioEngine, audioEngine } from '@/game/audio/AudioEngine';

// Input
import { BufferedInput } from '@/game/input/BufferedInput';

// Network
import { BinaryPacker } from '@/network/BinaryPacker';
import { InputRingBuffer } from '@/network/InputRingBuffer';
import { NetworkTransformBuffer } from '@/network/NetworkTransformBuffer';
import { NetworkClient } from '@/network/NetworkClient';
```

---

## 4. Server Application Imports

### 4.1 Core Imports

```typescript
// Entry point dependencies
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
```

### 4.2 Room Imports

```typescript
import { GameRoom } from './rooms/GameRoom';
```

### 4.3 Engine Bridge

```typescript
import { ServerEngineBridge } from './engine/ServerEngineBridge';

// From shared engine
import {
  WorldState,
  TransformAccess,
  PhysicsAccess,
  PhysicsSystem,
  MovementSystem,
  STRIDES,
} from '@cjr/engine';
```

### 4.4 Schema Imports

```typescript
import { GameStateSchema } from './schema/GameState';
```

---

## 5. Common Import Mistakes (and Fixes)

### 5.1 Wrong: Using deprecated Store wrappers

```typescript
// WRONG: Legacy Store wrappers (deprecated)
import { TransformStore } from '@cjr/engine';
TransformStore.set(world, id, x, y, rotation, scale);

// CORRECT: Use Access classes
import { TransformAccess } from '@cjr/engine';
TransformAccess.set(world, id, x, y, rotation, scale, prevX, prevY, prevRot);
```

### 5.2 Wrong: Importing from wrong module path

```typescript
// WRONG: Old path
import { mixPigment } from '@cjr/engine/cjr/colorMath';

// CORRECT: Import from package root
import { mixPigment } from '@cjr/engine';

// OR explicit module import
import { mixPigment } from '@cjr/engine/modules/cjr';
```

### 5.3 Wrong: Using global singleton

```typescript
// WRONG: Global singleton
import { defaultWorld } from '@cjr/engine';
defaultWorld.transform[idx] = x;

// CORRECT: Use instance accessor
import { getWorld } from '@/game/engine/context';
const world = getWorld();
world.transform[idx] = x;
```

### 5.4 Wrong: Mixing client and engine imports

```typescript
// WRONG: Client imports in engine package
import { VFXRingBuffer } from '@cjr/engine';

// CORRECT: VFX is client-only
import { VFXRingBuffer } from '@/game/engine/VFXRingBuffer';
```

### 5.5 Wrong: Using relative paths for packages

```typescript
// WRONG: Relative path to package
import { WorldState } from '../../packages/engine/src/generated/WorldState';

// CORRECT: Use alias
import { WorldState } from '@cjr/engine';
```

---

## 6. TypeScript Configuration

### 6.1 Client tsconfig.json Paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@cjr/shared": ["../../packages/shared/src"],
      "@cjr/engine": ["../../packages/engine/src"],
      "@services/*": ["./src/services/*"],
      "@components/*": ["./src/components/*"]
    }
  }
}
```

### 6.2 Server tsconfig.json Paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@cjr/shared": ["../../packages/shared/src"],
      "@cjr/engine": ["../../packages/engine/src"]
    }
  }
}
```

---

## 7. Import Order Convention

```typescript
// 1. External packages (node_modules)
import React, { useState, useEffect } from 'react';
import { Application } from 'pixi.js';
import { Client } from 'colyseus.js';

// 2. Monorepo packages (@cjr/*)
import { WorldState, TransformAccess } from '@cjr/engine';
import { EntityType, MAX_PLAYERS } from '@cjr/shared';

// 3. Absolute imports (@/*)
import { GameStateManager } from '@/game/engine/GameStateManager';
import { HUD } from '@/components/HUD';
import { useGameSession } from '@/hooks/useGameSession';

// 4. Relative imports (./)
import { localHelper } from './helpers';
import type { LocalType } from './types';

// 5. Style imports
import './styles.css';
```

---

## 8. Re-export Pattern

When creating module index files:

```typescript
// packages/engine/src/generated/index.ts

// Named exports (preferred)
export { WorldState, MAX_ENTITIES, STRIDES, defaultWorld } from './WorldState';
export * from './ComponentAccessors';   // Access classes

// packages/engine/src/modules/cjr/index.ts
export { CJRModule, cjrModule, createCJRModule } from './CJRModule';
export { registerCJRComponents } from './index';
export * from './colorMath';
export * from './ringSystem';
export * from './tattoos';
```

---

## 9. Troubleshooting

### "Cannot find module '@cjr/engine'"

1. Check `tsconfig.json` paths are correct
2. Check `vite.config.ts` aliases match
3. Run `npm install` in root to link workspaces

### "Module has no exported member 'X'"

1. Check the export exists in the package's `index.ts`
2. Check for typos in the import name
3. Verify the function/type is actually exported (not internal)
4. **New exports might be in `generated/` or `modules/cjr/`**

### "Circular dependency detected"

1. Move shared types to `@cjr/shared`
2. Use interfaces instead of concrete implementations
3. Use dependency injection pattern

### "Using deprecated Store wrapper"

1. Replace `TransformStore` → `TransformAccess`
2. Replace `PhysicsStore` → `PhysicsAccess`
3. Replace `StatsStore` → `StatsAccess`
4. Replace `resetAllStores()` → `world.reset()`

---

**End of Document**
