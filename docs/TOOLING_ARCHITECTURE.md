# Color Jelly Rush - Tooling Architecture Research

> **Date:** February 2, 2026
> **Purpose:** Design tooling suite for Game Designers and QA

---

## Executive Summary

Đề xuất tạo **3 công cụ chính** cho phép Game Designer và QA làm việc độc lập:

| Tool | Mục đích | Người dùng chính |
|------|----------|-----------------|
| **Level Editor** | Thiết kế level, điều chỉnh balance | Game Designer |
| **Packet Inspector** | Debug network traffic | QA, Devs |
| **State Viewer** | Xem real-time game state | QA, Game Designer |

---

## 1. Level Editor

### 1.1 Mục tiêu

Cho phép Game Designer:
- Điều chỉnh level configs mà không cần sửa code
- Preview thay đổi real-time
- Export/Import configs dạng JSON
- Hot-reload vào game đang chạy

### 1.2 Current State Analysis

**Cấu trúc Level Config hiện tại:**
```typescript
// packages/engine/src/config/levels.ts
interface LevelConfig {
  id: number;
  name: string;

  // Thresholds
  thresholds: {
    ring2: number;      // 0.5 = 50% match để vào Ring 2
    ring3: number;      // 0.7 = 70% match để vào Ring 3
    win: number;        // 0.9 = 90% match để win
  };

  // Timing
  winHoldSeconds: number;  // Thời gian giữ position để win
  timeLimit: number;       // Game duration (seconds)

  // Wave Spawning
  waveIntervals: { ring1: number; ring2: number; ring3: number };  // ms
  burstSizes: { ring1: number; ring2: number; ring3: number };     // count
  spawnWeights: { pigment: number; neutral: number; special: number };

  // AI
  botCount: number;

  // Boss
  boss: {
    boss1Enabled: boolean;
    boss1Time: number;
    boss1Health: number;
    boss2Enabled: boolean;
    boss2Time: number;
    boss2Health: number;
  };

  // Pity System
  pity: {
    stuckThreshold: number;  // seconds without progress
    duration: number;
    multiplier: number;
  };

  // Debuffs
  ring3Debuff: {
    enabled: boolean;
    threshold: number;
    duration: number;
    speedMultiplier: number;
  };

  rushWindowDuration: number;
}
```

**10 Levels hiện có:**
1. Tutorial 1-3 (learning curve)
2. Intro Boss
3. Core Runs 1-2
4. Rush 1-3
5. Master Run

### 1.3 Architecture Proposal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LEVEL EDITOR                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        WEB UI (React)                                │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│   │   │ Level List  │  │  Property   │  │      Visual Preview         │ │   │
│   │   │             │  │   Editor    │  │                             │ │   │
│   │   │ • Tutorial 1│  │             │  │    ┌───────────────────┐    │ │   │
│   │   │ • Tutorial 2│  │ Thresholds: │  │    │     Ring 3        │    │ │   │
│   │   │ • ...       │  │ ├─ Ring2: ▓▓│  │    │   ┌───────────┐   │    │ │   │
│   │   │             │  │ ├─ Ring3: ▓▓│  │    │   │  Ring 2   │   │    │ │   │
│   │   │ [+ New]     │  │ └─ Win:   ▓▓│  │    │   │ ┌───────┐ │   │    │ │   │
│   │   │             │  │             │  │    │   │ │Ring 1 │ │   │    │ │   │
│   │   │ [Import]    │  │ Waves:      │  │    │   │ └───────┘ │   │    │ │   │
│   │   │ [Export]    │  │ ├─ Ring1: ▓▓│  │    │   └───────────┘   │    │ │   │
│   │   │             │  │ ├─ Ring2: ▓▓│  │    └───────────────────┘    │ │   │
│   │   └─────────────┘  │ └─ Ring3: ▓▓│  │                             │ │   │
│   │                    │             │  │    Spawn Points: ●●●●       │ │   │
│   │                    │ Boss:       │  │    Bot Paths: ───────       │ │   │
│   │                    │ ├─ Enable ☑ │  │                             │ │   │
│   │                    │ ├─ Time: ▓▓▓│  │    [Play Preview]           │ │   │
│   │                    │ └─ HP:   ▓▓▓│  │    [Hot Reload to Game]     │ │   │
│   │                    └─────────────┘  └─────────────────────────────┘ │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ WebSocket                             │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     CONFIG SERVER (Express)                          │   │
│   │                                                                      │   │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │   │
│   │   │  REST API       │  │  WebSocket Hub  │  │  File Watcher       │ │   │
│   │   │                 │  │                 │  │                     │ │   │
│   │   │ GET /levels     │  │ Broadcast       │  │ Watch:              │ │   │
│   │   │ POST /levels    │  │ changes to:     │  │ levels.json         │ │   │
│   │   │ PUT /levels/:id │  │ • Editor UI     │  │ constants.json      │ │   │
│   │   │ DELETE /levels  │  │ • Game Client   │  │                     │ │   │
│   │   │                 │  │ • Game Server   │  │ On change:          │ │   │
│   │   │ POST /validate  │  │                 │  │ → Broadcast reload  │ │   │
│   │   │ POST /export    │  │                 │  │                     │ │   │
│   │   └─────────────────┘  └─────────────────┘  └─────────────────────┘ │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                           ┌──────────┴──────────┐                            │
│                           ▼                     ▼                            │
│   ┌───────────────────────────────┐  ┌───────────────────────────────────┐  │
│   │      GAME CLIENT              │  │         GAME SERVER               │  │
│   │                               │  │                                   │  │
│   │   LevelConfigHotReload        │  │   LevelConfigHotReload            │  │
│   │   └─ On message:              │  │   └─ On message:                  │  │
│   │      getLevelConfig(id)       │  │      updateLevelConfig(id)        │  │
│   │      returns new config       │  │      applyToActiveRooms()         │  │
│   └───────────────────────────────┘  └───────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Implementation Plan

**Phase 1: Config Externalization (1-2 days)**
```typescript
// Chuyển levels.ts → levels.json (externalize)
// data/levels/level_1.json
{
  "id": 1,
  "name": "Tutorial 1",
  "thresholds": { "ring2": 0.5, "ring3": 0.7, "win": 0.9 },
  "winHoldSeconds": 1.5,
  "timeLimit": 180,
  "waveIntervals": { "ring1": 8000, "ring2": 10000, "ring3": 12000 },
  "burstSizes": { "ring1": 5, "ring2": 4, "ring3": 3 },
  "spawnWeights": { "pigment": 0.6, "neutral": 0.25, "special": 0.15 },
  "botCount": 3,
  "boss": { "boss1Enabled": false }
}

// packages/engine/src/config/levels.ts
export function getLevelConfig(id: number): LevelConfig {
  // Dev mode: load from JSON file
  if (import.meta.env.DEV) {
    return loadLevelFromJson(id);
  }
  // Prod mode: bundled configs
  return BUNDLED_LEVELS[id];
}
```

**Phase 2: Config Server (2-3 days)**
```typescript
// tools/level-editor/server/index.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';

const app = express();
const wss = new WebSocketServer({ port: 8081 });

// REST API
app.get('/api/levels', (req, res) => {
  const levels = loadAllLevels();
  res.json(levels);
});

app.put('/api/levels/:id', (req, res) => {
  const validated = validateLevelConfig(req.body);
  if (validated.errors.length > 0) {
    return res.status(400).json({ errors: validated.errors });
  }

  saveLevelConfig(req.params.id, req.body);
  broadcastToClients({ type: 'LEVEL_UPDATED', levelId: req.params.id });
  res.json({ success: true });
});

// File Watcher for external edits
chokidar.watch('data/levels/*.json').on('change', (path) => {
  const levelId = extractLevelId(path);
  broadcastToClients({ type: 'LEVEL_UPDATED', levelId });
});
```

**Phase 3: Editor UI (3-4 days)**
```tsx
// tools/level-editor/ui/src/App.tsx
function LevelEditor() {
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [selected, setSelected] = useState<LevelConfig | null>(null);

  // WebSocket for real-time sync
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8081');
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'LEVEL_UPDATED') {
        fetchLevels(); // Refresh
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div className="editor-layout">
      <LevelList levels={levels} onSelect={setSelected} />
      <PropertyEditor level={selected} onChange={handleSave} />
      <VisualPreview level={selected} />
    </div>
  );
}

// Visual Preview Component (Canvas-based)
function VisualPreview({ level }: { level: LevelConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !level) return;

    // Draw rings
    drawRing(ctx, RING_1_RADIUS, '#3498db', 'Ring 1');
    drawRing(ctx, RING_2_RADIUS, '#2ecc71', 'Ring 2');
    drawRing(ctx, RING_3_RADIUS, '#e74c3c', 'Ring 3');

    // Draw spawn zones
    drawSpawnZones(ctx, level.waveIntervals, level.burstSizes);

    // Draw threshold indicators
    drawThresholdArc(ctx, level.thresholds);
  }, [level]);

  return <canvas ref={canvasRef} width={600} height={600} />;
}
```

**Phase 4: Hot Reload Integration (1-2 days)**
```typescript
// apps/client/src/dev/LevelHotReload.ts
class LevelHotReload {
  private ws: WebSocket | null = null;

  connect() {
    if (import.meta.env.PROD) return; // Only in dev

    this.ws = new WebSocket('ws://localhost:8081');
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'LEVEL_UPDATED') {
        this.reloadLevel(msg.levelId);
      }
    };
  }

  private async reloadLevel(levelId: number) {
    const response = await fetch(`http://localhost:8080/api/levels/${levelId}`);
    const newConfig = await response.json();

    // Update engine config
    setLevelConfig(levelId, newConfig);

    // Notify game
    gameStateManager.emitEvent({ type: 'CONFIG_RELOADED', levelId });

    console.log(`🔄 Level ${levelId} hot-reloaded`);
  }
}
```

### 1.5 Validation Rules

```typescript
// tools/level-editor/server/validation.ts
const LevelConfigSchema = z.object({
  id: z.number().min(1).max(100),
  name: z.string().min(1).max(50),

  thresholds: z.object({
    ring2: z.number().min(0).max(1),
    ring3: z.number().min(0).max(1),
    win: z.number().min(0).max(1),
  }).refine(t => t.ring2 < t.ring3 && t.ring3 < t.win, {
    message: 'Thresholds must be: ring2 < ring3 < win'
  }),

  winHoldSeconds: z.number().min(0.5).max(10),
  timeLimit: z.number().min(30).max(600),

  waveIntervals: z.object({
    ring1: z.number().min(1000).max(30000),
    ring2: z.number().min(1000).max(30000),
    ring3: z.number().min(1000).max(30000),
  }),

  burstSizes: z.object({
    ring1: z.number().min(1).max(20),
    ring2: z.number().min(1).max(20),
    ring3: z.number().min(1).max(20),
  }),

  botCount: z.number().min(0).max(20),

  // ... more validation
});
```

---

## 2. Packet Inspector

### 2.1 Mục tiêu

Cho phép QA và Dev:
- Xem tất cả network traffic (send/receive)
- Decode binary packets thành readable format
- Filter theo packet type, entity, thời gian
- Record/replay sessions
- Detect anomalies (packet loss, latency spikes)

### 2.2 Current Network Protocol

**Binary Packet Format:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TRANSFORM PACKET                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Byte 0        Bytes 1-4       Bytes 5-6      Bytes 7+                     │
│   ┌────────┐   ┌───────────┐   ┌───────────┐   ┌─────────────────────────┐  │
│   │ Type   │   │ Timestamp │   │  Count    │   │      Entries            │  │
│   │ (u8)   │   │  (f32)    │   │  (u16)    │   │                         │  │
│   │   3    │   │  1234.56  │   │   50      │   │  [id][x][y][vx][vy]...  │  │
│   └────────┘   └───────────┘   └───────────┘   └─────────────────────────┘  │
│                                                                              │
│   Entry Format (Indexed):                                                    │
│   ┌────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌─────────┐  │
│   │ Index  │   │    X      │   │    Y      │   │    VX     │   │   VY    │  │
│   │ (u16)  │   │  (f32)    │   │  (f32)    │   │  (f32)    │   │ (f32)   │  │
│   └────────┘   └───────────┘   └───────────┘   └───────────┘   └─────────┘  │
│   2 bytes      4 bytes         4 bytes         4 bytes         4 bytes      │
│   Total: 18 bytes per entity                                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EVENT PACKET                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────┐   ┌───────────┐   ┌───────────┐   ┌─────────────────────────┐  │
│   │ Type   │   │ Timestamp │   │  Count    │   │      Events             │  │
│   │ (u8)   │   │  (f32)    │   │  (u8)     │   │                         │  │
│   │   2    │   │  1234.56  │   │   5       │   │  [type][id][data][x][y] │  │
│   └────────┘   └───────────┘   └───────────┘   └─────────────────────────┘  │
│                                                                              │
│   Event Types:                                                               │
│   1 = ENTITY_KILLED                                                          │
│   2 = STATUS_APPLIED                                                         │
│   3 = RING_TRANSITION                                                        │
│   4 = BOSS_SPAWN                                                             │
│   5 = WIN_CONDITION                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Architecture Proposal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PACKET INSPECTOR                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        WEB UI (React)                                │   │
│   │                                                                      │   │
│   │   ┌──────────────────────────────────────────────────────────────┐  │   │
│   │   │                    PACKET TIMELINE                            │  │   │
│   │   │                                                               │  │   │
│   │   │  ◀ 0ms ──────────────────────────────────────────── 1000ms ▶ │  │   │
│   │   │     │    │   │     │││  │    │      │   ││    │   │    │     │  │   │
│   │   │     ▼    ▼   ▼     ▼▼▼  ▼    ▼      ▼   ▼▼    ▼   ▼    ▼     │  │   │
│   │   │     🟢   🔵  🟢    🔵🔵🔵🟢   🔴     🟢  🔵🔵   🟢  🔴   🟢    │  │   │
│   │   │                                                               │  │   │
│   │   │  🟢 Transform   🔵 Event   🔴 Error   [Zoom] [Filter]         │  │   │
│   │   └──────────────────────────────────────────────────────────────┘  │   │
│   │                                                                      │   │
│   │   ┌─────────────────────┐  ┌────────────────────────────────────┐   │   │
│   │   │    PACKET LIST      │  │        PACKET DETAIL               │   │   │
│   │   │                     │  │                                    │   │   │
│   │   │ #1234 TRANSFORM     │  │  Type: TRANSFORM_UPDATE_INDEXED    │   │   │
│   │   │   16:42:03.456      │  │  Time: 16:42:03.456                │   │   │
│   │   │   50 entities       │  │  Size: 908 bytes                   │   │   │
│   │   │   908 bytes    ◀────┼──│  Entities: 50                      │   │   │
│   │   │                     │  │                                    │   │   │
│   │   │ #1235 EVENT         │  │  ┌──────────────────────────────┐  │   │   │
│   │   │   16:42:03.472      │  │  │ DECODED DATA                 │  │   │   │
│   │   │   3 events          │  │  │                              │  │   │   │
│   │   │   128 bytes         │  │  │ Entity 0: Player "Bob"       │  │   │   │
│   │   │                     │  │  │   x: 1234.56, y: 789.01      │  │   │   │
│   │   │ #1236 ERROR ⚠️      │  │  │   vx: 12.3, vy: -4.5         │  │   │   │
│   │   │   16:42:03.512      │  │  │                              │  │   │   │
│   │   │   Timeout           │  │  │ Entity 1: Bot "AI_01"        │  │   │   │
│   │   │                     │  │  │   x: 567.89, y: 234.56       │  │   │   │
│   │   │ [Record] [Export]   │  │  │   vx: -8.1, vy: 2.3          │  │   │   │
│   │   └─────────────────────┘  │  │                              │  │   │   │
│   │                            │  │ ...                          │  │   │   │
│   │   ┌─────────────────────┐  │  └──────────────────────────────┘  │   │   │
│   │   │      FILTERS        │  │                                    │   │   │
│   │   │                     │  │  [Copy JSON] [Copy Binary]         │   │   │
│   │   │ Type: [All ▼]       │  └────────────────────────────────────┘   │   │
│   │   │ Entity: [______]    │                                           │   │
│   │   │ Size: [Min] [Max]   │  ┌────────────────────────────────────┐   │   │
│   │   │ Time: [From] [To]   │  │        STATISTICS                  │   │   │
│   │   │                     │  │                                    │   │   │
│   │   │ ☑ Show Transforms   │  │  Packets/sec: 62                   │   │   │
│   │   │ ☑ Show Events       │  │  Bandwidth: 4.2 KB/s               │   │   │
│   │   │ ☑ Show Errors       │  │  Avg Latency: 45ms                 │   │   │
│   │   └─────────────────────┘  │  Packet Loss: 0.1%                 │   │   │
│   │                            │                                    │   │   │
│   │                            │  [📊 Charts] [📈 History]          │   │   │
│   │                            └────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Implementation Plan

**Phase 1: Packet Interceptor Hook (1-2 days)**
```typescript
// apps/client/src/dev/PacketInterceptor.ts
interface CapturedPacket {
  id: number;
  direction: 'send' | 'receive';
  type: PacketType;
  timestamp: number;
  size: number;
  raw: ArrayBuffer;
  decoded: DecodedPacket;
}

class PacketInterceptor {
  private packets: CapturedPacket[] = [];
  private listeners: Set<(packet: CapturedPacket) => void> = new Set();
  private recording = false;
  private maxPackets = 10000;

  // Hook into NetworkClient
  install(networkClient: NetworkClient) {
    // Intercept sends
    const originalSend = networkClient.sendRaw.bind(networkClient);
    networkClient.sendRaw = (data: ArrayBuffer) => {
      this.capture('send', data);
      return originalSend(data);
    };

    // Intercept receives
    networkClient.onRawMessage = (data: ArrayBuffer) => {
      this.capture('receive', data);
    };
  }

  private capture(direction: 'send' | 'receive', data: ArrayBuffer) {
    if (!this.recording) return;

    const packet: CapturedPacket = {
      id: this.packets.length,
      direction,
      type: this.getPacketType(data),
      timestamp: performance.now(),
      size: data.byteLength,
      raw: data.slice(0), // Clone
      decoded: BinaryPacker.decode(data),
    };

    this.packets.push(packet);
    if (this.packets.length > this.maxPackets) {
      this.packets.shift();
    }

    this.listeners.forEach(cb => cb(packet));
  }

  subscribe(callback: (packet: CapturedPacket) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  exportSession(): string {
    return JSON.stringify(this.packets, (key, value) => {
      if (value instanceof ArrayBuffer) {
        return Array.from(new Uint8Array(value));
      }
      return value;
    });
  }
}

export const packetInterceptor = new PacketInterceptor();
```

**Phase 2: Binary Decoder Display (2 days)**
```typescript
// tools/packet-inspector/src/components/PacketDecoder.tsx
function PacketDecoder({ packet }: { packet: CapturedPacket }) {
  const [view, setView] = useState<'decoded' | 'hex' | 'binary'>('decoded');

  return (
    <div className="packet-decoder">
      <div className="view-tabs">
        <button onClick={() => setView('decoded')}>Decoded</button>
        <button onClick={() => setView('hex')}>Hex</button>
        <button onClick={() => setView('binary')}>Binary</button>
      </div>

      {view === 'decoded' && <DecodedView packet={packet} />}
      {view === 'hex' && <HexView data={packet.raw} />}
      {view === 'binary' && <BinaryView data={packet.raw} />}
    </div>
  );
}

function DecodedView({ packet }: { packet: CapturedPacket }) {
  const { decoded } = packet;

  if (decoded.type === PacketType.TRANSFORM_UPDATE_INDEXED) {
    return (
      <div className="decoded-transform">
        <div className="header">
          <span>Timestamp: {decoded.timestamp.toFixed(2)}ms</span>
          <span>Entities: {decoded.entities.length}</span>
        </div>
        <table className="entity-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>X</th>
              <th>Y</th>
              <th>VX</th>
              <th>VY</th>
            </tr>
          </thead>
          <tbody>
            {decoded.entities.map((e, i) => (
              <tr key={i}>
                <td>{e.index}</td>
                <td>{e.x.toFixed(2)}</td>
                <td>{e.y.toFixed(2)}</td>
                <td>{e.vx.toFixed(2)}</td>
                <td>{e.vy.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ... other packet types
}

function HexView({ data }: { data: ArrayBuffer }) {
  const bytes = new Uint8Array(data);
  const rows: string[][] = [];

  for (let i = 0; i < bytes.length; i += 16) {
    const row = Array.from(bytes.slice(i, i + 16))
      .map(b => b.toString(16).padStart(2, '0'));
    rows.push(row);
  }

  return (
    <pre className="hex-view">
      {rows.map((row, i) => (
        <div key={i}>
          <span className="offset">{(i * 16).toString(16).padStart(8, '0')}</span>
          <span className="bytes">{row.join(' ')}</span>
        </div>
      ))}
    </pre>
  );
}
```

**Phase 3: Inspector UI (2-3 days)**
```tsx
// tools/packet-inspector/src/App.tsx
function PacketInspector() {
  const [packets, setPackets] = useState<CapturedPacket[]>([]);
  const [selected, setSelected] = useState<CapturedPacket | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    // Connect to game via WebSocket
    const ws = new WebSocket('ws://localhost:8082/inspector');
    ws.onmessage = (e) => {
      const packet = JSON.parse(e.data);
      setPackets(prev => [...prev.slice(-9999), packet]);
    };
    return () => ws.close();
  }, []);

  const filteredPackets = useMemo(() => {
    return packets.filter(p => matchesFilters(p, filters));
  }, [packets, filters]);

  const stats = useMemo(() => ({
    packetsPerSec: calculatePacketsPerSec(packets),
    bandwidth: calculateBandwidth(packets),
    avgLatency: calculateAvgLatency(packets),
  }), [packets]);

  return (
    <div className="inspector-layout">
      <Timeline packets={filteredPackets} onSelect={setSelected} />
      <div className="main-content">
        <PacketList
          packets={filteredPackets}
          selected={selected}
          onSelect={setSelected}
        />
        <PacketDetail packet={selected} />
      </div>
      <Sidebar>
        <FilterPanel filters={filters} onChange={setFilters} />
        <Statistics stats={stats} />
        <Controls
          recording={recording}
          onToggleRecord={() => setRecording(!recording)}
          onExport={() => exportPackets(packets)}
        />
      </Sidebar>
    </div>
  );
}
```

---

## 3. State Viewer

### 3.1 Mục tiêu

Cho phép QA và Game Designer:
- Xem real-time game state (DOD stores)
- Inspect bất kỳ entity nào
- Watch specific values với breakpoints
- Visualize spatial data (entity positions on map)
- Time-travel debugging (pause, step, rewind)

### 3.2 Current State Structure

**DOD Stores để visualize:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOD MEMORY LAYOUT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TransformStore (Float32Array, 4096 * 8 = 32KB)                            │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐                         │
│   │  x  │  y  │ rot │scale│prevX│prevY│prevR│ pad │  Entity 0              │
│   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤                         │
│   │  x  │  y  │ rot │scale│prevX│prevY│prevR│ pad │  Entity 1              │
│   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤                         │
│   │ ... │ ... │ ... │ ... │ ... │ ... │ ... │ ... │  ...                    │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘                         │
│                                                                              │
│   PhysicsStore (Float32Array, 4096 * 8 = 32KB)                              │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐                         │
│   │ vx  │ vy  │vRot │mass │radius│rest │fric │ pad │  Entity 0              │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘                         │
│                                                                              │
│   StateStore (Uint16Array, 4096 * 1 = 8KB)                                  │
│   ┌────────────────────────────────────────────────┐                        │
│   │ Flags: ACTIVE|PLAYER|BOT|FOOD|DEAD|RING1|...  │                        │
│   └────────────────────────────────────────────────┘                        │
│                                                                              │
│   StatsStore (Float32Array, 4096 * 8 = 32KB)                                │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐                         │
│   │ hp  │maxHp│score│match│ def │dmgMul│ pad │ pad │  Entity 0              │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘                         │
│                                                                              │
│   Total Memory: ~120KB for 4096 entities                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Architecture Proposal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STATE VIEWER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        WEB UI (React)                                │   │
│   │                                                                      │   │
│   │   ┌────────────────────────────────────────────────────────────────┐│   │
│   │   │                    TOOLBAR                                      ││   │
│   │   │  [⏸ Pause] [▶ Play] [⏭ Step] [⏪ Rewind]  Frame: 12345  FPS: 60││   │
│   │   └────────────────────────────────────────────────────────────────┘│   │
│   │                                                                      │   │
│   │   ┌──────────────────────────┐  ┌────────────────────────────────┐  │   │
│   │   │      ENTITY TREE         │  │        WORLD VIEW              │  │   │
│   │   │                          │  │                                │  │   │
│   │   │  📁 Players (3)          │  │    ┌────────────────────┐     │  │   │
│   │   │    └─ 👤 Player_0 ◀──────┼──│────│   ●  ●      ●      │     │  │   │
│   │   │    └─ 👤 Player_1        │  │    │      ◆    ●        │     │  │   │
│   │   │    └─ 👤 Player_2        │  │    │  ●      ▲      ●   │     │  │   │
│   │   │  📁 Bots (5)             │  │    │    ●  ●    ●       │     │  │   │
│   │   │    └─ 🤖 Bot_0           │  │    │         ★          │     │  │   │
│   │   │    └─ 🤖 Bot_1           │  │    │    ●         ●     │     │  │   │
│   │   │    └─ ...                │  │    │  ●    ●   ●    ●   │     │  │   │
│   │   │  📁 Food (127)           │  │    └────────────────────┘     │  │   │
│   │   │    └─ 🔴 Pigment (76)    │  │                                │  │   │
│   │   │    └─ ⚪ Neutral (32)    │  │    Legend:                     │  │   │
│   │   │    └─ ✨ Special (19)    │  │    ● Food  👤 Player  ★ Boss  │  │   │
│   │   │  📁 Projectiles (2)      │  │    🤖 Bot  ▲ Projectile       │  │   │
│   │   │                          │  │                                │  │   │
│   │   │  [Filter: ________]      │  │    [Zoom +] [Zoom -] [Reset]   │  │   │
│   │   └──────────────────────────┘  └────────────────────────────────┘  │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    INSPECTOR PANEL                           │   │   │
│   │   │                                                              │   │   │
│   │   │  Entity: Player_0 (Index: 0)                                 │   │   │
│   │   │                                                              │   │   │
│   │   │  ┌─ Transform ─────────────────────────────────────────────┐ │   │   │
│   │   │  │  x: 1234.56 [📌]    y: 789.01 [📌]                      │ │   │   │
│   │   │  │  rotation: 0.00     scale: 1.00                         │ │   │   │
│   │   │  │  prevX: 1233.45     prevY: 788.90                       │ │   │   │
│   │   │  └─────────────────────────────────────────────────────────┘ │   │   │
│   │   │                                                              │   │   │
│   │   │  ┌─ Physics ───────────────────────────────────────────────┐ │   │   │
│   │   │  │  vx: 12.30 [📌]     vy: -4.50 [📌]                      │ │   │   │
│   │   │  │  mass: 1.00         radius: 25.00                       │ │   │   │
│   │   │  │  friction: 0.92     restitution: 0.80                   │ │   │   │
│   │   │  └─────────────────────────────────────────────────────────┘ │   │   │
│   │   │                                                              │   │   │
│   │   │  ┌─ Stats ─────────────────────────────────────────────────┐ │   │   │
│   │   │  │  health: 100/100    score: 1250                         │ │   │   │
│   │   │  │  matchPercent: 0.75 ████████████████░░░░░░ 75%          │ │   │   │
│   │   │  │  ring: 2                                                │ │   │   │
│   │   │  └─────────────────────────────────────────────────────────┘ │   │   │
│   │   │                                                              │   │   │
│   │   │  ┌─ Flags ─────────────────────────────────────────────────┐ │   │   │
│   │   │  │  ☑ ACTIVE  ☑ PLAYER  ☐ BOT  ☐ FOOD  ☐ DEAD             │ │   │   │
│   │   │  │  ☐ RING_1  ☑ RING_2  ☐ RING_3                          │ │   │   │
│   │   │  └─────────────────────────────────────────────────────────┘ │   │   │
│   │   │                                                              │   │   │
│   │   │  [📌] = Pinned to Watch Panel                                │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                      WATCH PANEL                             │   │   │
│   │   │                                                              │   │   │
│   │   │  Name                    Value      Min    Max    Δ/frame    │   │   │
│   │   │  ─────────────────────────────────────────────────────────   │   │   │
│   │   │  Player_0.x              1234.56    -50    1500   +1.11      │   │   │
│   │   │  Player_0.vx             12.30      -100   100    -0.50      │   │   │
│   │   │  Player_0.matchPercent   0.75       0      1      +0.01      │   │   │
│   │   │                                                              │   │   │
│   │   │  [+ Add Watch]  [Clear All]                                  │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Implementation Plan

**Phase 1: State Snapshot API (1-2 days)**
```typescript
// apps/client/src/dev/StateSnapshot.ts
interface EntitySnapshot {
  index: number;
  type: EntityType;
  transform: { x: number; y: number; rotation: number; scale: number };
  physics: { vx: number; vy: number; mass: number; radius: number };
  stats: { health: number; maxHealth: number; score: number; matchPercent: number };
  flags: number;
  // CJR specific
  pigment?: { r: number; g: number; b: number };
  ring?: number;
  tattoos?: number[];
}

interface GameSnapshot {
  frame: number;
  timestamp: number;
  entities: EntitySnapshot[];
  gameState: {
    gameTime: number;
    bossActive: boolean;
    rushWindowActive: boolean;
  };
}

class StateSnapshotService {
  private history: GameSnapshot[] = [];
  private maxHistory = 600; // 10 seconds at 60fps
  private paused = false;
  private currentFrame = 0;

  captureSnapshot(): GameSnapshot {
    const entities: EntitySnapshot[] = [];

    for (let i = 0; i < MAX_ENTITIES; i++) {
      if ((StateStore.flags[i] & EntityFlags.ACTIVE) === 0) continue;

      const tIdx = i * TransformStore.STRIDE;
      const pIdx = i * PhysicsStore.STRIDE;
      const sIdx = i * StatsStore.STRIDE;

      entities.push({
        index: i,
        type: getEntityType(StateStore.flags[i]),
        transform: {
          x: TransformStore.data[tIdx],
          y: TransformStore.data[tIdx + 1],
          rotation: TransformStore.data[tIdx + 2],
          scale: TransformStore.data[tIdx + 3],
        },
        physics: {
          vx: PhysicsStore.data[pIdx],
          vy: PhysicsStore.data[pIdx + 1],
          mass: PhysicsStore.data[pIdx + 3],
          radius: PhysicsStore.data[pIdx + 4],
        },
        stats: {
          health: StatsStore.data[sIdx],
          maxHealth: StatsStore.data[sIdx + 1],
          score: StatsStore.data[sIdx + 2],
          matchPercent: StatsStore.data[sIdx + 3],
        },
        flags: StateStore.flags[i],
      });
    }

    return {
      frame: this.currentFrame++,
      timestamp: performance.now(),
      entities,
      gameState: this.captureGameState(),
    };
  }

  // Time travel
  rewindTo(frame: number) {
    const snapshot = this.history.find(s => s.frame === frame);
    if (snapshot) {
      this.applySnapshot(snapshot);
    }
  }

  stepForward() {
    if (this.paused) {
      // Run one physics tick
      gameStateManager.updateGameState(1/60);
      this.captureAndStore();
    }
  }
}
```

**Phase 2: World View Renderer (2 days)**
```tsx
// tools/state-viewer/src/components/WorldView.tsx
function WorldView({ snapshot }: { snapshot: GameSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !snapshot) return;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 600, 600);

    // Apply transform
    ctx.save();
    ctx.translate(300 + offset.x, 300 + offset.y);
    ctx.scale(zoom, zoom);

    // Draw rings
    drawRings(ctx);

    // Draw entities
    for (const entity of snapshot.entities) {
      drawEntity(ctx, entity);
    }

    ctx.restore();
  }, [snapshot, zoom, offset]);

  return (
    <div className="world-view">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onWheel={handleZoom}
        onMouseDrag={handlePan}
      />
      <div className="controls">
        <button onClick={() => setZoom(z => z * 1.2)}>+</button>
        <button onClick={() => setZoom(z => z / 1.2)}>-</button>
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
  );
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: EntitySnapshot) {
  const { x, y } = entity.transform;
  const scale = 600 / 3400; // Map to canvas

  ctx.beginPath();

  switch (entity.type) {
    case 'player':
      ctx.fillStyle = '#00ff00';
      ctx.arc(x * scale, y * scale, 8, 0, Math.PI * 2);
      break;
    case 'bot':
      ctx.fillStyle = '#ff6600';
      ctx.arc(x * scale, y * scale, 6, 0, Math.PI * 2);
      break;
    case 'food':
      ctx.fillStyle = entity.pigment
        ? `rgb(${entity.pigment.r * 255}, ${entity.pigment.g * 255}, ${entity.pigment.b * 255})`
        : '#ffffff';
      ctx.arc(x * scale, y * scale, 3, 0, Math.PI * 2);
      break;
  }

  ctx.fill();
}
```

**Phase 3: Inspector Panel (2 days)**
```tsx
// tools/state-viewer/src/components/InspectorPanel.tsx
function InspectorPanel({ entity }: { entity: EntitySnapshot | null }) {
  const [watches, setWatches] = useState<Watch[]>([]);

  if (!entity) {
    return <div className="inspector-empty">Select an entity</div>;
  }

  const addWatch = (path: string) => {
    setWatches(w => [...w, { path, entityIndex: entity.index }]);
  };

  return (
    <div className="inspector-panel">
      <h3>Entity: {getEntityName(entity)} (Index: {entity.index})</h3>

      <CollapsibleSection title="Transform">
        <PropertyRow name="x" value={entity.transform.x} onPin={() => addWatch('transform.x')} />
        <PropertyRow name="y" value={entity.transform.y} onPin={() => addWatch('transform.y')} />
        <PropertyRow name="rotation" value={entity.transform.rotation} />
        <PropertyRow name="scale" value={entity.transform.scale} />
      </CollapsibleSection>

      <CollapsibleSection title="Physics">
        <PropertyRow name="vx" value={entity.physics.vx} onPin={() => addWatch('physics.vx')} />
        <PropertyRow name="vy" value={entity.physics.vy} onPin={() => addWatch('physics.vy')} />
        <PropertyRow name="mass" value={entity.physics.mass} />
        <PropertyRow name="radius" value={entity.physics.radius} />
      </CollapsibleSection>

      <CollapsibleSection title="Stats">
        <PropertyRow name="health" value={entity.stats.health} />
        <ProgressBar
          label="matchPercent"
          value={entity.stats.matchPercent}
          max={1}
          format={v => `${(v * 100).toFixed(0)}%`}
        />
        <PropertyRow name="score" value={entity.stats.score} />
      </CollapsibleSection>

      <CollapsibleSection title="Flags">
        <FlagsDisplay flags={entity.flags} />
      </CollapsibleSection>
    </div>
  );
}

function FlagsDisplay({ flags }: { flags: number }) {
  const flagNames = [
    'ACTIVE', 'PLAYER', 'BOT', 'FOOD', 'PROJECTILE', 'DEAD',
    'FOOD_PIGMENT', 'FOOD_NEUTRAL', 'FOOD_SPECIAL',
    'RING_1', 'RING_2', 'RING_3',
  ];

  return (
    <div className="flags-display">
      {flagNames.map((name, i) => (
        <label key={name}>
          <input
            type="checkbox"
            checked={(flags & (1 << i)) !== 0}
            readOnly
          />
          {name}
        </label>
      ))}
    </div>
  );
}
```

**Phase 4: Time Travel (2 days)**
```tsx
// tools/state-viewer/src/components/TimelineControls.tsx
function TimelineControls({
  snapshotService
}: {
  snapshotService: StateSnapshotService
}) {
  const [paused, setPaused] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [maxFrame, setMaxFrame] = useState(0);

  const handlePause = () => {
    snapshotService.pause();
    setPaused(true);
  };

  const handlePlay = () => {
    snapshotService.resume();
    setPaused(false);
  };

  const handleStep = () => {
    snapshotService.stepForward();
    setCurrentFrame(f => f + 1);
  };

  const handleSeek = (frame: number) => {
    snapshotService.rewindTo(frame);
    setCurrentFrame(frame);
  };

  return (
    <div className="timeline-controls">
      <button onClick={paused ? handlePlay : handlePause}>
        {paused ? '▶ Play' : '⏸ Pause'}
      </button>
      <button onClick={handleStep} disabled={!paused}>
        ⏭ Step
      </button>

      <input
        type="range"
        min={0}
        max={maxFrame}
        value={currentFrame}
        onChange={(e) => handleSeek(parseInt(e.target.value))}
        disabled={!paused}
      />

      <span>Frame: {currentFrame} / {maxFrame}</span>
      <span>FPS: {snapshotService.getFPS()}</span>
    </div>
  );
}
```

---

## 4. Unified Tools Architecture

### 4.1 Deployment Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT OPTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Option A: Standalone Web App (Recommended for QA)                          │
│   ─────────────────────────────────────────────────────────────              │
│                                                                              │
│   ┌───────────────────┐     WebSocket      ┌───────────────────┐            │
│   │  Tools Web App    │◄──────────────────►│   Running Game    │            │
│   │  (localhost:8080) │                    │   (localhost:5173)│            │
│   └───────────────────┘                    └───────────────────┘            │
│                                                                              │
│   Pros: Separate window, no game impact, can run on different machine       │
│   Cons: Need network connection, slight latency                              │
│                                                                              │
│   ────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   Option B: In-Game Overlay (Recommended for Dev)                            │
│   ───────────────────────────────────────────────                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         GAME WINDOW                                  │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    GAME CANVAS                               │   │   │
│   │   │                                                              │   │   │
│   │   │                                                              │   │   │
│   │   │                                    ┌────────────────────────┐│   │   │
│   │   │                                    │  DEV TOOLS OVERLAY     ││   │   │
│   │   │                                    │  [Level] [Net] [State] ││   │   │
│   │   │                                    │  ...                   ││   │   │
│   │   │                                    └────────────────────────┘│   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │   Toggle: F12 or ?debug=1                                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Pros: Immediate feedback, no network, tighter integration                  │
│   Cons: May impact performance, shares game window                           │
│                                                                              │
│   ────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   Option C: Electron Desktop App (For standalone distribution)               │
│   ──────────────────────────────────────────────────────────────             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      ELECTRON APP                                    │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ Level Editor│  │Packet Insp. │  │ State Viewer│                 │   │
│   │   │    Tab      │  │    Tab      │  │    Tab      │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   │                                                                      │   │
│   │   + File system access                                               │   │
│   │   + Native notifications                                             │   │
│   │   + Global shortcuts                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Recommended Tech Stack

| Tool | Frontend | Backend | Communication |
|------|----------|---------|---------------|
| Level Editor | React + Tailwind | Express + File Watcher | REST + WebSocket |
| Packet Inspector | React + Victory Charts | None (client-only) | Game WebSocket |
| State Viewer | React + Canvas | None (client-only) | Game Memory Access |

### 4.3 Shared Components

```typescript
// tools/shared/src/components/
export { PropertyEditor } from './PropertyEditor';
export { Timeline } from './Timeline';
export { SearchFilter } from './SearchFilter';
export { JsonViewer } from './JsonViewer';
export { HexViewer } from './HexViewer';
export { CanvasRenderer } from './CanvasRenderer';

// tools/shared/src/hooks/
export { useWebSocket } from './useWebSocket';
export { useLocalStorage } from './useLocalStorage';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// tools/shared/src/utils/
export { formatBytes } from './formatBytes';
export { formatTimestamp } from './formatTimestamp';
export { debounce, throttle } from './timing';
```

---

## 5. Implementation Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION TIMELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Week 1: Foundation                                                         │
│   ───────────────────                                                        │
│   Day 1-2: Config Externalization (JSON levels)                              │
│   Day 3-4: Config Server + File Watcher                                      │
│   Day 5:   Hot Reload Integration                                            │
│                                                                              │
│   Week 2: Level Editor                                                       │
│   ────────────────────                                                       │
│   Day 1-2: Level Editor UI (React)                                           │
│   Day 3:   Visual Preview Canvas                                             │
│   Day 4:   Validation & Export                                               │
│   Day 5:   Testing & Polish                                                  │
│                                                                              │
│   Week 3: Packet Inspector                                                   │
│   ────────────────────────                                                   │
│   Day 1:   Packet Interceptor Hook                                           │
│   Day 2:   Binary Decoder UI                                                 │
│   Day 3:   Timeline & Filters                                                │
│   Day 4:   Statistics & Export                                               │
│   Day 5:   Testing & Polish                                                  │
│                                                                              │
│   Week 4: State Viewer                                                       │
│   ──────────────────────                                                     │
│   Day 1:   Snapshot Service                                                  │
│   Day 2:   Entity Tree & Inspector                                           │
│   Day 3:   World View Canvas                                                 │
│   Day 4:   Watch Panel & Time Travel                                         │
│   Day 5:   Integration & Testing                                             │
│                                                                              │
│   Week 5: Integration & Documentation                                        │
│   ──────────────────────────────────────                                     │
│   Day 1-2: Unified deployment (Option A or B)                                │
│   Day 3:   User documentation                                                │
│   Day 4:   Training materials                                                │
│   Day 5:   QA feedback & iteration                                           │
│                                                                              │
│   Total: ~5 weeks (1 developer)                                              │
│   Or: ~2.5 weeks (2 developers parallel)                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Quick Win: Minimal Viable Tooling

Nếu cần ship nhanh, đây là MVP cho mỗi tool:

### 6.1 Level Editor MVP (3 days)
```
- JSON file editing với VS Code
- JSON Schema for validation + autocomplete
- Script to hot-reload into game
- No visual preview (just JSON)
```

### 6.2 Packet Inspector MVP (2 days)
```
- Console logging với formatted output
- Toggle via ?debug_network=1
- No UI, just structured console logs
```

### 6.3 State Viewer MVP (2 days)
```
- In-game overlay với basic stats
- Toggle via F12
- Show: entity count, FPS, memory, player stats
```

---

## 7. Security Considerations

```
⚠️ IMPORTANT: All dev tools must be DISABLED in production builds!

// vite.config.ts
build: {
  define: {
    '__DEV_TOOLS__': JSON.stringify(process.env.NODE_ENV === 'development')
  }
}

// Usage
if (__DEV_TOOLS__) {
  packetInterceptor.install(networkClient);
  stateViewer.enable();
}
```

---

## Summary

| Tool | Complexity | Time | Priority |
|------|------------|------|----------|
| Level Editor | Medium | 2 weeks | P0 (Game Designer needs) |
| State Viewer | Medium | 1.5 weeks | P1 (QA needs) |
| Packet Inspector | Low-Medium | 1 week | P2 (Dev debugging) |

**Khuyến nghị:**
1. Bắt đầu với **Level Editor** vì Game Designer cần nhất
2. Tiếp theo **State Viewer** cho QA
3. **Packet Inspector** có thể dùng console logging trước

---

**End of Document**
