# Color Jelly Rush - Data Flow Architecture

> **Last Updated:** February 8, 2026
> **Purpose:** Visual guide to data flow throughout the system

---

## 1. High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐      ┌──────────────────┐      ┌─────────────────────┐       │
│   │ Keyboard │      │   BufferedInput  │      │   InputStore (DOD)  │       │
│   │  Mouse   │─────►│   Ring Buffer    │─────►│   TypedArray        │       │
│   │  Touch   │      └──────────────────┘      └──────────┬──────────┘       │
│   └──────────┘                                           │                   │
│                                                          ▼                   │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        GAME LOOP (60 FPS)                            │  │
│   │  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────┐    │  │
│   │  │ CJRClient   │   │ WorldState       │   │  DOD Component     │    │  │
│   │  │ Runner      │──►│ .update(dt)      │──►│  Access Classes    │    │  │
│   │  └─────────────┘   └──────────────────┘   └────────────────────┘    │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                       │                                      │
│                    ┌──────────────────┼──────────────────┐                  │
│                    ▼                  ▼                  ▼                  │
│   ┌──────────────────────┐  ┌─────────────────┐  ┌───────────────────┐     │
│   │   React Components   │  │   Canvas2D /    │  │   NetworkClient   │     │
│   │   (HUD, Overlays)    │  │   Pixi.js       │  │   (Colyseus)      │     │
│   └──────────────────────┘  └─────────────────┘  └─────────┬─────────┘     │
│                                                              │               │
└──────────────────────────────────────────────────────────────┼───────────────┘
                                                               │
                                                               ▼
                                                    ┌───────────────────┐
                                                    │   GAME SERVER     │
                                                    │   (Authoritative) │
                                                    └───────────────────┘
```

---

## 2. Game Loop Data Flow

### 2.1 Single-Player Mode

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIXED TIMESTEP GAME LOOP                            │
│                              (60 ticks/sec)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. INPUT PHASE                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  BufferedInput.syncToStore(playerIndex, worldPos, cameraPos)       │    │
│   │      ↓                                                              │    │
│   │  world.input[idx*4 + 0] = targetX                                   │    │
│   │  world.input[idx*4 + 1] = targetY                                   │    │
│   │  world.input[idx*4 + 2] = skillInput (0 or 1)                       │    │
│   │  world.input[idx*4 + 3] = reserved                                  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                               │
│   2. PHYSICS UPDATE                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  CJRClientRunner.updateEntities(dt)                                 │    │
│   │      ↓                                                              │    │
│   │  MovementSystem.update(world, dt) → world.physics (velocity)        │    │
│   │  PhysicsSystem.update(world, dt) → world.transform (position)       │    │
│   │  SkillSystem.update(world, dt) → world.skill, effects               │    │
│   │  ringSystem.update() → Ring progression                             │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                               │
│   3. SYNC DOD → OBJECTS (for legacy/UI)                                      │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  EntityStateBridge.syncFromDOD()                                    │    │
│   │  state.player.position.x = world.transform[pIdx * 8]                │    │
│   │  state.player.position.y = world.transform[pIdx * 8 + 1]            │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                               │
│   4. VFX & AUDIO UPDATE                                                      │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  JuiceSystem.update(dt)                                             │    │
│   │  audioEngine.setListenerPosition(playerX, playerY)                  │    │
│   │  audioEngine.setBGMIntensity(matchPercent * 4)                      │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                               │
│   5. NOTIFY SUBSCRIBERS                                                      │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  gameStateManager.notifySubscribers()                               │    │
│   │      ↓                                                              │    │
│   │  React re-render (HUD, overlays)                                    │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                               │
│   6. RENDER PHASE (runs at display refresh rate)                             │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │  renderCallback(alpha)                                              │    │
│   │      ↓                                                              │    │
│   │  getInterpolatedPositionByIndex(physicsIndex, alpha, outPoint)      │    │
│   │  Interpolation: pos = prev + (curr - prev) * alpha                  │    │
│   │  DrawStrategies.Player(ctx, entity, x, y)                           │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Player Mode

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTIPLAYER DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CLIENT                                     SERVER                          │
│   ──────                                     ──────                          │
│                                                                              │
│   ┌─────────────────┐                                                        │
│   │ BufferedInput   │                                                        │
│   │ popEvents()     │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────┐         Binary Packet          ┌─────────────────┐    │
│   │ NetworkClient   │ ══════════════════════════════►│ GameRoom        │    │
│   │ .sendInput()    │         (60 msgs/s)            │ onMessage()     │    │
│   └─────────────────┘                                └────────┬────────┘    │
│                                                                │             │
│                                                                ▼             │
│                                                       ┌─────────────────┐    │
│                                                       │ GameRoom        │    │
│                                                       │ TransformAccess │    │
│                                                       │ PhysicsAccess   │    │
│                                                       └────────┬────────┘    │
│                                                                │             │
│                                                                ▼             │
│   ┌─────────────────┐         State Snapshot         ┌─────────────────┐    │
│   │ NetworkClient   │ ◄══════════════════════════════│ GameRoom        │    │
│   │ onStateChange() │         (20 msgs/s)            │ broadcastPatch  │    │
│   └────────┬────────┘                                └─────────────────┘    │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────┐                                                        │
│   │ Ring Buffer     │ ◄── Store snapshots for interpolation                 │
│   │ Interpolation   │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────┐                                                        │
│   │ Client Render   │ ◄── Smooth visual updates                              │
│   └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DOD (Data-Oriented Design) Data Flow

### 3.1 WorldState Layout (Instance-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WORLDSTATE CLASS (Instance-Based)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   const world = getWorld();  // Instance accessor                            │
│                                                                              │
│   world.transform (Float32Array) - STRIDE = 8                                │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  idx*8+0  │  idx*8+1  │  idx*8+2  │  idx*8+3  │  idx*8+4  │  ...     │ │
│   │    x      │    y      │  rotation │   scale   │   prevX   │  prevY   │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.physics (Float32Array) - STRIDE = 8                                  │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  idx*8+0  │  idx*8+1  │  idx*8+2  │  idx*8+3  │  idx*8+4  │  ...     │ │
│   │    vx     │    vy     │  angVel   │   mass    │   radius  │  restit  │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.stateFlags (Uint32Array) - Entity bitmask flags                      │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  stateFlags[idx] = ACTIVE | PLAYER | RING_1 | BOT | FOOD | DEAD | ...│ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.stats (Float32Array) - STRIDE = 8                                    │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  idx*8+0  │  idx*8+1  │  idx*8+2  │  idx*8+3  │  idx*8+4  │  ...     │ │
│   │   health  │  maxHealth│   score   │   match   │   defense │  damage  │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.input (Float32Array) - STRIDE = 4                                    │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  idx*4+0  │  idx*4+1  │  idx*4+2  │  idx*4+3  │                       │ │
│   │  targetX  │  targetY  │ skillFlag │  reserved │                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.pigment (Float32Array) - STRIDE = 8                                  │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  idx*8+0  │  idx*8+1  │  idx*8+2  │  ...     │                        │ │
│   │     r     │     g     │     b     │  target  │                        │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   world.activeEntities (Uint16Array) - Sparse Set                            │
│   world.activeCount (number) - Number of active entities                     │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  [idx0, idx1, idx2, ...] - Only active entity IDs                     │ │
│   │  Iterate: for (let i = 0; i < world.activeCount; i++)                 │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Access Class Pattern (Static Methods)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ACCESS CLASS PATTERN (Static)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   // NEW: TransformAccess (static methods)                                   │
│   TransformAccess.set(world, id, x, y, rotation, scale, prevX, prevY, pR)   │
│   TransformAccess.getX(world, id) → number                                  │
│   TransformAccess.getY(world, id) → number                                  │
│                                                                              │
│   // NEW: PhysicsAccess (static methods)                                     │
│   PhysicsAccess.set(world, id, vx, vy, angVel, mass, radius, rest, fric)    │
│   PhysicsAccess.getVx(world, id) → number                                   │
│   PhysicsAccess.getRadius(world, id) → number                               │
│                                                                              │
│   // DEPRECATED: Legacy Store wrappers (compat.ts)                           │
│   TransformStore.set(world, id, x, y, rotation, scale)  // → Access.set()   │
│   PhysicsStore.set(world, id, vx, vy, mass, radius)     // → Access.set()   │
│   ⚠️ These log deprecation warnings in development mode                     │
│                                                                              │
│   // Direct array access (most performant)                                   │
│   world.transform[id * 8 + 0] = newX;                                        │
│   world.transform[id * 8 + 1] = newY;                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 System Data Access Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM UPDATE FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        MovementSystem                                │   │
│   │                                                                      │   │
│   │   READS:    world.input (targetX, targetY)                           │   │
│   │             world.transform (x, y)                                   │   │
│   │                                                                      │   │
│   │   WRITES:   world.physics (vx, vy)                                   │   │
│   │                                                                      │   │
│   │   // Use Sparse Set for O(Active) iteration                          │   │
│   │   for (let i = 0; i < world.activeCount; i++) {                      │   │
│   │     const idx = world.activeEntities[i];                             │   │
│   │     const tIdx = idx * 8;                                            │   │
│   │     const iIdx = idx * 4;                                            │   │
│   │     const dx = world.input[iIdx] - world.transform[tIdx];            │   │
│   │     const dy = world.input[iIdx+1] - world.transform[tIdx+1];        │   │
│   │     world.physics[tIdx] = dx * speed;                                │   │
│   │     world.physics[tIdx + 1] = dy * speed;                            │   │
│   │   }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        PhysicsSystem                                 │   │
│   │                                                                      │   │
│   │   READS:    world.physics (vx, vy)                                   │   │
│   │                                                                      │   │
│   │   WRITES:   world.transform (x, y, prevX, prevY)                     │   │
│   │                                                                      │   │
│   │   for (let i = 0; i < world.activeCount; i++) {                      │   │
│   │     const idx = world.activeEntities[i];                             │   │
│   │     const tIdx = idx * 8;                                            │   │
│   │     // Store previous position for interpolation                     │   │
│   │     world.transform[tIdx + 4] = world.transform[tIdx];                │   │
│   │     world.transform[tIdx + 5] = world.transform[tIdx + 1];            │   │
│   │     // Apply velocity                                                │   │
│   │     world.transform[tIdx] += world.physics[tIdx] * dt;               │   │
│   │     world.transform[tIdx + 1] += world.physics[tIdx + 1] * dt;       │   │
│   │   }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        SkillSystem                                   │   │
│   │                                                                      │   │
│   │   READS:    world.input (skillFlag)                                  │   │
│   │             world.skill (cooldowns)                                  │   │
│   │             world.transform (x, y)                                   │   │
│   │                                                                      │   │
│   │   WRITES:   world.skill (cooldowns)                                  │   │
│   │             world.physics (for dash velocity)                        │   │
│   │             vfxBuffer (for VFX triggers)                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. VFX Ring Buffer Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VFX RING BUFFER FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GAME SYSTEMS (Headless Engine)                                             │
│   ──────────────────────────────                                             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  combat.ts / SkillSystem / AISystem                                  │   │
│   │                                                                      │   │
│   │  // Emit events into ring buffer (zero allocation)                   │   │
│   │  vfxBuffer.push(                                                     │   │
│   │    world.transform[entityId * 8],      // x from DOD                 │   │
│   │    world.transform[entityId * 8 + 1],  // y from DOD                 │   │
│   │    packedColor,                                                      │   │
│   │    VFX_TYPES.EXPLODE,                                                │   │
│   │    intensity                                                         │   │
│   │  );                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     VFXRingBuffer                                    │   │
│   │                                                                      │   │
│   │   [slot0] [slot1] [slot2] [slot3] ... [slotN]                        │   │
│   │      ↑                        ↑                                      │   │
│   │    head                      tail                                    │   │
│   │                                                                      │   │
│   │   - Fixed size (256 slots)                                           │   │
│   │   - Circular overwrite (oldest events discarded)                     │   │
│   │   - Zero GC allocation                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   CLIENT VFX LAYER                                                           │
│   ──────────────────                                                         │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  JuiceSystem.update(dt)                                              │   │
│   │                                                                      │   │
│   │  vfxBuffer.drain((x, y, color, type, intensity) => {                 │   │
│   │    switch (type) {                                                   │   │
│   │      case VFX_TYPES.EXPLODE:                                         │   │
│   │        particleSystem.emit(x, y, color, intensity);                  │   │
│   │        break;                                                        │   │
│   │      case VFX_TYPES.SCREEN_SHAKE:                                    │   │
│   │        this.shakeOffset.x = (Math.random() - 0.5) * intensity;       │   │
│   │        break;                                                        │   │
│   │      case VFX_TYPES.FLOATING_TEXT:                                   │   │
│   │        this.floatingTexts.push({x, y, text: TEXT_IDS[intensity]});   │   │
│   │        break;                                                        │   │
│   │    }                                                                 │   │
│   │  });                                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. React UI Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REACT UI DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      GameStateManager                                │   │
│   │                                                                      │   │
│   │   currentState: GameState                                            │   │
│   │   subscribers: Set<(state: GameState) => void>                       │   │
│   │   eventListeners: Set<(event: GameEvent) => void>                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                │                                       │                     │
│                │ notifySubscribers()                   │ emitEvent()         │
│                ▼                                       ▼                     │
│   ┌──────────────────────────┐           ┌──────────────────────────┐       │
│   │    useGameDataBridge     │           │     useGameSession       │       │
│   │                          │           │                          │       │
│   │  const [state, setState] │           │  subscribeEvent(event)   │       │
│   │    = useState<GameState> │           │                          │       │
│   │                          │           │  switch (event.type) {   │       │
│   │  useEffect(() => {       │           │    case 'GAME_OVER':     │       │
│   │    manager.subscribe(    │           │      setScreen('over');  │       │
│   │      setState            │           │    case 'TATTOO_REQUEST':│       │
│   │    );                    │           │      showTattooPicker(); │       │
│   │  }, []);                 │           │  }                       │       │
│   └────────────┬─────────────┘           └──────────────────────────┘       │
│                │                                                             │
│                │ props drilling / context                                    │
│                ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         React Components                             │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│   │   │     HUD     │  │  Minimap    │  │      Leaderboard            │ │   │
│   │   │             │  │             │  │                             │ │   │
│   │   │ HP: {hp}    │  │ {entities}  │  │ 1. {player1.name}           │ │   │
│   │   │ Match: {%}  │  │             │  │ 2. {player2.name}           │ │   │
│   │   └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   KEY PRINCIPLE: React components are READ-ONLY observers                    │
│   - Never mutate GameState directly from components                          │
│   - Dispatch actions through GameStateManager methods                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Rendering Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RENDERING PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FIXED TICK (60 Hz)                    VARIABLE FRAME (Display Hz)          │
│   ─────────────────                     ─────────────────────────            │
│                                                                              │
│   ┌─────────────────┐                   ┌─────────────────────────────────┐ │
│   │ Physics Update  │                   │         Render Frame            │ │
│   │                 │                   │                                 │ │
│   │ prevPos = curr  │                   │  alpha = accumulator / tickRate │ │
│   │ currPos += vel  │                   │                                 │ │
│   └─────────────────┘                   │  for (let i = 0; i < food.len)  │ │
│           │                             │    const pos = physicsIndex ?   │ │
│           │                             │      getInterpolatedPosition    │ │
│           ▼                             │        ByIndex(idx, alpha, pt)  │ │
│   ┌─────────────────┐                   │      : entity.position;         │ │
│   │ world.transform │──────────────────►│                                 │ │
│   │                 │                   │    DrawStrategies.Food(ctx,     │ │
│   │ [prevX, prevY]  │                   │      entity, pos.x, pos.y);     │ │
│   │ [currX, currY]  │                   │                                 │ │
│   └─────────────────┘                   │  ctx.fillRect(...)              │ │
│                                         └─────────────────────────────────┘ │
│                                                                              │
│   Timeline:                                                                  │
│   ─────────                                                                  │
│                                                                              │
│   Tick 0        Tick 1        Tick 2        Tick 3                           │
│     │             │             │             │                              │
│     ▼             ▼             ▼             ▼                              │
│   ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐                         │
│   │ R │ R │ R │ R │ R │ R │ R │ R │ R │ R │ R │ R │ ← Render frames          │
│   └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘                         │
│                                                                              │
│   60 ticks/sec + 144 renders/sec = smooth visuals                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Network Sync Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NETWORK SYNCHRONIZATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CLIENT A                    SERVER                    CLIENT B             │
│   ────────                    ──────                    ────────             │
│                                                                              │
│   t=0  Input: Move Right                                                     │
│        ┌──────────────┐                                                      │
│        │ sendInput()  │────────►┌──────────────┐                            │
│        │ targetX: 100 │         │ GameRoom     │                            │
│        │ targetY: 50  │         │ onMessage()  │                            │
│        └──────────────┘         └──────┬───────┘                            │
│                                        │                                     │
│   t=16ms                               ▼                                     │
│        Local Prediction         ┌──────────────┐                            │
│        ┌──────────────┐         │TransformAccess                            │
│        │ x: 101       │         │.set(world,id,│                            │
│        │ y: 50        │         │  101,50,...) │                            │
│        └──────────────┘         └──────┬───────┘                            │
│                                        │                                     │
│   t=50ms (RTT)                         │ broadcast                           │
│        ◄───────────────────────────────┼────────────────────────────►       │
│                                        │                                     │
│        ┌──────────────┐         ┌──────┴───────┐        ┌──────────────┐    │
│        │ State Patch  │         │ State:       │        │ State Patch  │    │
│        │              │◄────────│ playerA.x=101│───────►│              │    │
│        │ Reconcile    │         │ playerA.y=50 │        │ Interpolate  │    │
│        └──────────────┘         └──────────────┘        └──────────────┘    │
│                                                                              │
│   Client A: Prediction + Reconciliation                                      │
│   Client B: Interpolation (smooth following)                                 │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     RING BUFFER INTERPOLATION                        │   │
│   │                                                                      │   │
│   │   Buffer: [snap0] [snap1] [snap2] [snap3] ...                        │   │
│   │              ↑               ↑                                       │   │
│   │           older           newer                                      │   │
│   │                                                                      │   │
│   │   Render at t - 100ms (delay for smoothness)                         │   │
│   │   Interpolate between snap1 and snap2                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. CJR Game Logic Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CJR MECHANICS DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PLAYER CONSUMES PIGMENT (DOD Path)                                         │
│   ──────────────────────────────────                                         │
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │ Collision    │────►│ consumePickup│────►│ PigmentStore │               │
│   │ Detection    │     │ DOD()        │     │ .mix()       │               │
│   └──────────────┘     │              │     └───────┬──────┘                │
│                        │ // Read food │             │                        │
│                        │ // from DOD  │             ▼                        │
│                        │ world.pigment│     ┌──────────────┐                │
│                        │ [fIdx+0] = r │     │world.stats   │                │
│                        │              │     │ [idx+3]=match│                │
│                        └──────────────┘     └───────┬──────┘                │
│                                                     │                        │
│                                                     ▼                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       RING PROGRESSION                               │   │
│   │                                                                      │   │
│   │   if (matchPercent >= 0.5 && currentRing === 1) {                    │   │
│   │     commitToRing2();                                                 │   │
│   │     applyBonus(shield: 2s, speedBoost: 3s);                          │   │
│   │   }                                                                  │   │
│   │                                                                      │   │
│   │   if (matchPercent >= 0.7 && currentRing === 2) {                    │   │
│   │     commitToRing3();                                                 │   │
│   │     applyBonus(shield: 3s, speedBoost: 4s);                          │   │
│   │   }                                                                  │   │
│   │                                                                      │   │
│   │   ┌─────────┐      ┌─────────┐      ┌─────────┐                      │   │
│   │   │ RING 1  │─────►│ RING 2  │─────►│ RING 3  │───► WIN CONDITION    │   │
│   │   │ Outer   │ 50%  │ Middle  │ 70%  │ Center  │                      │   │
│   │   └─────────┘      └─────────┘      └─────────┘                      │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   WIN CONDITION                                                              │
│   ─────────────                                                              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │   if (currentRing === 3 && matchPercent >= 0.9) {                    │   │
│   │     holdTimer += dt;                                                 │   │
│   │                                                                      │   │
│   │     // Heartbeat pulse every 0.5s                                    │   │
│   │     if (holdTimer % 0.5 < dt) {                                      │   │
│   │       emitHeartbeatVFX(intensity: holdTimer / 1.5);                  │   │
│   │     }                                                                │   │
│   │                                                                      │   │
│   │     if (holdTimer >= 1.5) {                                          │   │
│   │       VICTORY!                                                       │   │
│   │     }                                                                │   │
│   │   } else {                                                           │   │
│   │     holdTimer = max(0, holdTimer - dt * 0.5); // Partial decay       │   │
│   │   }                                                                  │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Authority Summary (SSOT)

| Data | Authority (SSOT) | Access Class | Read By | Write By |
|------|------------------|--------------|---------|----------|
| Position (x, y) | `world.transform` | `TransformAccess` | Renderer, Physics, UI | PhysicsSystem |
| Velocity (vx, vy) | `world.physics` | `PhysicsAccess` | PhysicsSystem | MovementSystem, Skills |
| Health/Score | `world.stats` | `StatsAccess` | UI, Combat | Combat, Pickup |
| Input Target | `world.input` | `InputAccess` | MovementSystem | BufferedInput |
| Entity Flags | `world.stateFlags` | `StateAccess` | All Systems | Factory, Lifecycle |
| Pigment/Color | `world.pigment` | `PigmentAccess` | ColorMath, Renderer | consumePickupDOD |
| Match Percent | `world.stats[idx+3]` | `StatsAccess` | UI, Ring Logic | Combat |
| Ring Level | Entity flags | `StateAccess` | Ring Logic, UI | ringSystem |
| Tattoos | `world.tattoo` | `TattooAccess` | TattooSystem | Upgrade |
| Skill Cooldowns | `world.skill` | `SkillAccess` | SkillSystem, UI | SkillSystem |

---

## 10. Key Architecture Principles (Feb 2026)

1. **Instance-Based WorldState**: Use `getWorld()` accessor, not global singletons
2. **Access Classes Over Store Wrappers**: Use `TransformAccess.set()` not `TransformStore.set()`
3. **Sparse Set Iteration**: Use `world.activeEntities` for O(active) iteration
4. **DOD Position for VFX**: Always read `world.transform[id * 8]` for VFX positions
5. **Hybrid Fallback**: If `physicsIndex !== undefined`, use DOD; else fallback to OOP

---

**End of Document**
