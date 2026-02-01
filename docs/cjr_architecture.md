# Color Jelly Rush - Software Architecture Document

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Status:** Active  
**Document Owner:** Architecture Team

---

## 1. Executive Summary

This document defines the canonical software architecture for the Color Jelly Rush game system. It establishes architectural principles, design patterns, and implementation standards that must be followed across all development activities.

### 1.1 Purpose

- Define the authoritative architecture for current and future development
- Establish invariants and constraints that ensure system reliability
- Provide implementation guidelines for consistency across the codebase
- Document performance requirements and testing standards

### 1.2 Scope

This architecture applies to:

- Game engine core systems
- UI/Rendering layer
- Network synchronization
- Data management and persistence
- Testing infrastructure

---

## 2. Architectural Principles

### 2.1 Core Philosophy

> "A system is defined by how it fails, not how it works when things go right."

The architecture prioritizes:

- **Predictability** over flexibility
- **Fail-fast** mechanisms over silent corruption
- **Explicit** data flow over implicit coupling
- **Compile-time** safety over runtime flexibility

### 2.2 Non-Negotiable Invariants

#### 2.2.1 Single Source of Truth (SSOT)

Every piece of data has exactly ONE authoritative location. Derived or cached data must be clearly marked and reconstructible from the source.

#### 2.2.2 Static Dependency Resolution

All module imports must be static and resolved at bundle time. Runtime `require()` is prohibited.

#### 2.2.3 Unidirectional Data Flow

Data flows in a single direction through the system architecture. Circular dependencies are not permitted.

#### 2.2.4 Fail-Fast Error Handling

Invalid states must trigger immediate failures rather than allowing silent data corruption.

---

## 3. System Architecture

### 3.1 Layered Architecture Overview

The system follows a strict layered architecture with defined responsibilities and communication patterns:

```
┌──────────────────────────────────────────────────────────────┐
│                         UI LAYER                             │
│  React Components ← Read GameState (Immutable View)          │
├──────────────────────────────────────────────────────────────┤
│                    SESSION LAYER                             │
│  GameStateManager: Session lifecycle, event dispatch         │
├──────────────────────────────────────────────────────────────┤
│                    ENGINE LAYER                              │
│  OptimizedEngine: Pure update logic, no side effects         │
├──────────────────────────────────────────────────────────────┤
│                     DOD LAYER                                │
│  ComponentStores: TypedArray authority for Physics/Stats     │
│  EntityManager: Index allocation/deallocation                │
├──────────────────────────────────────────────────────────────┤
│                  SYSTEMS LAYER                               │
│  PhysicsSystem, MovementSystem, SkillSystem, etc.            │
│  Pure functions: (stores, dt) → stores                       │
├──────────────────────────────────────────────────────────────┤
│                 NETWORK LAYER                                │
│  NetworkClient: Colyseus sync, Ring Buffer interpolation     │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Responsibilities

#### 3.2.1 UI Layer

- **Purpose:** User interface rendering and presentation
- **Technology:** React components
- **Access Pattern:** Read-only access to GameState
- **Restrictions:** Cannot mutate game state directly

#### 3.2.2 Session Layer

- **Purpose:** Game session lifecycle management
- **Key Component:** GameStateManager
- **Responsibilities:** Session start/stop, event dispatch, state coordination
- **Lifetime:** Matches game session lifetime

#### 3.2.3 Engine Layer

- **Purpose:** Core game loop and update orchestration
- **Key Component:** OptimizedEngine
- **Characteristics:** Pure update logic, no side effects
- **Owned By:** GameStateManager

#### 3.2.4 DOD (Data-Oriented Design) Layer

- **Purpose:** High-performance data storage using TypedArrays
- **Components:**
  - ComponentStores (TransformStore, PhysicsStore, StatsStore, etc.)
  - EntityManager (index lifecycle management)
- **Access Pattern:** Direct array access by index
- **Authority:** Single source of truth for entity components

#### 3.2.5 Systems Layer

- **Purpose:** Game logic implementation as pure functions
- **Examples:** PhysicsSystem, MovementSystem, SkillSystem
- **Signature:** `(stores, deltaTime) → mutated stores`
- **Characteristics:** Stateless, deterministic

#### 3.2.6 Network Layer

- **Purpose:** Client-server synchronization
- **Key Component:** NetworkClient
- **Technology:** Colyseus with ring buffer interpolation
- **Responsibilities:** State synchronization, latency compensation

---

## 4. Data Flow Architecture

### 4.1 Update Flow Diagram

```
Player Input
    ↓
InputManager
    ↓
GameStateManager.updateGameState(state, dt)
    ↓
OptimizedEngine.update(dt)
    ↓
PhysicsSystem.update(dt)
MovementSystem.update(dt)
[Other Systems...]
    ↓
Updated ComponentStores (TypedArrays)
    ↓
Return Mutated State
    ↓
GameStateManager.notifySubscribers()
    ↓
React Components (Re-render)
```

### 4.2 Data Authority Matrix

| Data Category     | Authority         | Read By                   | Write By                 |
| ----------------- | ----------------- | ------------------------- | ------------------------ |
| Position (x, y)   | TransformStore    | Engine, Renderer, Network | PhysicsSystem, Network   |
| Velocity (vx, vy) | PhysicsStore      | MovementSystem            | Input, Skills, Collision |
| Health, Score     | StatsStore        | UI, Engine                | Combat, Pickup           |
| Entity Type       | StateStore.flags  | All Systems               | Factory only             |
| Skill Cooldown    | SkillStore        | UI, SkillSystem           | SkillSystem              |
| Player Name       | GameState.player  | UI                        | Session Init             |
| Tattoos (UI)      | Player.tattoos[]  | UI                        | Upgrade System           |
| Tattoos (Logic)   | TattooStore.flags | TattooSystem              | Upgrade System           |

---

## 5. Implementation Standards

### 5.1 File Naming Conventions

| Type             | Pattern                             | Example                  |
| ---------------- | ----------------------------------- | ------------------------ |
| DOD Store        | `{Name}Store.ts`                    | `TransformStore.ts`      |
| System           | `{Name}System.ts`                   | `PhysicsSystem.ts`       |
| React Hook       | `use{Name}.ts`                      | `useGameSession.ts`      |
| React Component  | `{Name}.tsx`                        | `GameCanvas.tsx`         |
| Type Definitions | `{scope}.ts`                        | `player.ts`, `entity.ts` |
| Service          | `{Name}.ts` (class)                 | `NetworkClient.ts`       |
| Constants        | `constants.ts` or `{scope}Types.ts` | `cjrTypes.ts`            |

### 5.2 Prohibited Patterns

#### 5.2.1 Runtime require()

**❌ NEVER:**

```typescript
function execute() {
    const { vfxSystem } = require('../vfx/vfxSystem'); // Prohibited
    vfxSystem.emit(...);
}
```

**✅ ALWAYS:**

```typescript
import { vfxSystem } from '../vfx/vfxSystem';

function execute() {
    vfxSystem.emit(...);
}
```

#### 5.2.2 Dual-Write Pattern

**❌ NEVER:**

```typescript
// Multiple sources of truth
entity.statusMultipliers.speed = value; // Write 1
ConfigStore.setSpeedMultiplier(idx, value); // Write 2
```

**✅ ALWAYS:**

```typescript
// Single source with computed properties
ConfigStore.setSpeedMultiplier(idx, value);  // Authority

// OR use getters for derivation:
get speedMultiplier() {
    return ConfigStore.getSpeedMultiplier(this.physicsIndex);
}
```

#### 5.2.3 Object Mutation in DOD Systems

**❌ NEVER:**

```typescript
MovementSystem.update = (entity: Player, dt: number) => {
  entity.position.x += velocity * dt; // Object mutation prohibited
};
```

**✅ ALWAYS:**

```typescript
MovementSystem.update = (index: number, dt: number) => {
  const transformIndex = index * 8;
  TransformStore.data[transformIndex] += velocity * dt; // Store mutation
};
```

---

## 6. Entity Lifecycle Management

### 6.1 Entity Creation Protocol

```typescript
// Step 1: Allocate DOD Index
const idx = entityManager.allocate();

// Step 2: Initialize ALL Stores
TransformStore.set(idx, x, y, 0, 1);
PhysicsStore.set(idx, 0, 0, mass, radius);
StateStore.setFlag(idx, EntityFlags.ACTIVE | EntityFlags.PLAYER);
StatsStore.set(idx, hp, maxHp, 0, 0);

// Step 3: Create Object (for legacy/UI only)
const player: Player = {
  ...defaults,
  physicsIndex: idx,
};

// Step 4: Register in Lookup
EntityLookup[idx] = player;

// Step 5: Return
return player;
```

### 6.2 Entity Destruction Protocol

```typescript
// Step 1: Mark Dead in Store
StateStore.clearFlag(idx, EntityFlags.ACTIVE);
StateStore.setFlag(idx, EntityFlags.DEAD);

// Step 2: Clear Lookup
EntityLookup[idx] = null;

// Step 3: Deallocate Index (end of frame)
entityManager.deallocate(idx);

// Step 4: Remove from State arrays
filterInPlace(state.bots, b => b.physicsIndex !== idx);
```

---

## 7. Singleton Management

### 7.1 Singleton Registry

| Singleton        | Owner            | Lifetime              | Injection      |
| ---------------- | ---------------- | --------------------- | -------------- |
| gameStateManager | App              | Application lifecycle | Global         |
| optimizedEngine  | GameStateManager | Session               | Via manager    |
| networkClient    | GameStateManager | Session               | Via manager    |
| inputManager     | App              | Application lifecycle | Global         |
| entityManager    | Session          | Session               | Reset on start |
| vfxSystem        | Session          | Session               | Global         |

### 7.2 Singleton Guidelines

- Application-lifetime singletons are initialized once during app bootstrap
- Session-lifetime singletons are reset on game session start
- All singletons must be explicitly injected, never imported directly in systems

---

## 8. Testing Requirements

### 8.1 Unit Testing Standards

Every system module must include:

1. **Happy Path Tests:** Verify normal operation under expected conditions
2. **Boundary Condition Tests:** Edge cases including max entities, zero delta time, extreme values
3. **Error Handling Tests:** Invalid inputs, null references, out-of-bounds access

### 8.2 Integration Testing Standards

Critical integration tests required:

1. **Entity Lifecycle:** Creation → Update → Death → Index Reuse
2. **DOD ↔ Object Sync:** Verify no divergence between stores and objects
3. **Session Lifecycle:** Start → Play → End → Restart

### 8.3 Test Execution

```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run tests/spatialGrid.test.ts
```

---

## 9. Performance Requirements

### 9.1 Performance Budgets

| Metric               | Budget       | Measured By        |
| -------------------- | ------------ | ------------------ |
| Frame Time (60fps)   | < 16.67ms    | performance.now()  |
| Memory Delta / Frame | < 1KB        | performance.memory |
| Entity Count         | 500+         | Stress test        |
| GC Pauses            | 0 per minute | DevTools           |

### 9.2 Performance Monitoring

- Frame time must be logged in development mode
- Performance regression tests must run in CI/CD pipeline
- Production builds must include lightweight telemetry

---

## 10. Compliance and Enforcement

### 10.1 Code Review Requirements

All pull requests must verify:

- Adherence to layered architecture
- No prohibited patterns present
- Proper entity lifecycle management
- Test coverage for new systems

### 10.2 Architecture Decision Records (ADRs)

Any deviation from this architecture must be documented as an ADR including:

- Context and problem statement
- Decision made
- Consequences and trade-offs
- Review and approval signatures

---

## 11. References

### 11.1 Related Documentation

- Game Design Document
- API Reference Documentation
- Performance Optimization Guide
- Network Protocol Specification

### 11.2 External Resources

- Data-Oriented Design Principles
- React Performance Best Practices
- TypedArray Performance Characteristics
- Colyseus Network Architecture

---

## Appendix A: Glossary

| Term           | Definition                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| DOD            | Data-Oriented Design - Architecture pattern optimizing for cache locality   |
| SSOT           | Single Source of Truth - Principle ensuring one authoritative data location |
| TypedArray     | JavaScript typed array for efficient numeric data storage                   |
| ComponentStore | DOD storage container for entity component data                             |
| System         | Pure function operating on ComponentStores                                  |
| Entity Index   | Integer identifier for entity in ComponentStores                            |

---

## Document History

| Version | Date       | Author            | Changes                            |
| ------- | ---------- | ----------------- | ---------------------------------- |
| 1.0     | 2026-01-30 | Architecture Team | Initial architecture documentation |

---

**End of Document**
