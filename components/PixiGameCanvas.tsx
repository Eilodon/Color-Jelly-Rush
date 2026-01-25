
import React, { useEffect, useRef } from 'react';
import { Application, Container, Geometry, Shader, Mesh, Texture, Graphics, Text, TextStyle, BlurFilter } from 'pixi.js';
import { GameState, Entity, isPlayerOrBot, isFood, Particle } from '../types';
import { MAP_RADIUS } from '../constants';
import { RING_RADII, COLOR_PALETTE } from '../services/cjr/cjrConstants';
import { calcMatchPercent, pigmentToHex } from '../services/cjr/colorMath';
import { JELLY_VERTEX, JELLY_FRAGMENT } from '../services/cjr/shaders';
import { vfxIntegrationManager } from '../services/vfx/vfxIntegration';

// Performance Configuration
const USE_SHADERS = true; // Feature flag for rollout
const WORLD_SCALE = 1.0;

interface PixiGameCanvasProps {
  gameStateRef: React.MutableRefObject<GameState | null>;
  inputEnabled: boolean;
  alphaRef: React.MutableRefObject<number>; // Shared interpolation factor
}

const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({ gameStateRef, inputEnabled, alphaRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // ... (rest of refs) ...
  const meshesRef = useRef<Map<string, Mesh | Container>>(new Map());
  const particleLayerRef = useRef<Graphics | null>(null);
  const cameraSmoothRef = useRef({ x: 0, y: 0 }); // Smooth camera state
  const geometryCache = useRef<Geometry | null>(null);
  const shaderCache = useRef<Shader | null>(null);

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    // Initialize Pixi App
    const app = new Application();
    app.init({
      background: COLOR_PALETTE.background,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      // We keep Pixi's ticker for rendering (V-Sync), but we use alpha for position
    }).then(() => {
      if (!containerRef.current) return;
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      initResources();

      // Layers
      const world = new Container();
      world.label = 'World';
      world.x = app.screen.width / 2;
      world.y = app.screen.height / 2;
      app.stage.addChild(world);

      const mapLayer = new Container();
      world.addChild(mapLayer);
      drawMap(mapLayer);

      const entityLayer = new Container();
      world.addChild(entityLayer);

      const particleLayer = new Container();
      // Additive blend for particles gives a "glow" feel
      // particleLayer.blendMode = 'add'; // Checking Pixi v8 syntax validity - it's usually on the children or via proper Filter
      world.addChild(particleLayer);

      const uiLayer = new Container();
      app.stage.addChild(uiLayer);

      setupInputs(app, gameStateRef, world);

      // Render Loop
      app.ticker.add((ticker) => {
        const state = gameStateRef.current;
        if (!state || !state.player) return;

        // INTERPOLATION FACTOR
        const alpha = alphaRef.current;

        // Camera (Lerp with Alpha? No, camera is usually smoother if just lerped frame-by-frame or strictly followed)
        // For now, let's keep camera naive lerp but it might jitter if player is interpolated.
        // Better: Interpolate Camera Target.
        // Target = Player.prev * (1-a) + Player.curr * a.

        const p = state.player;
        const pX = p.prevPosition ? (p.prevPosition.x + (p.position.x - p.prevPosition.x) * alpha) : p.position.x;
        const pY = p.prevPosition ? (p.prevPosition.y + (p.position.y - p.prevPosition.y) * alpha) : p.position.y;

        const targetX = -pX + app.screen.width / 2;
        const targetY = -pY + app.screen.height / 2;

        // Camera Smoothing
        cameraSmoothRef.current.x += (targetX - cameraSmoothRef.current.x) * 0.1;
        cameraSmoothRef.current.y += (targetY - cameraSmoothRef.current.y) * 0.1;

        // Apply Shake
        const shake = vfxIntegrationManager.getScreenShakeOffset();
        world.x = cameraSmoothRef.current.x + shake.x;
        world.y = cameraSmoothRef.current.y + shake.y;

        // Render Entities
        syncEntities(entityLayer, state, app.ticker.lastTime / 1000, alpha);

        // Render Particles
        syncParticles(particleLayer, state.particles, app.ticker.lastTime / 1000, alpha);

        // VFX / UI - Ring Pulse Animation
        if (ringsGraphicsRef.current) {
          const t = app.ticker.lastTime / 1000;

          // Check for active King/Pulse state
          // If any player has kingForm > 0 or we have pulse events
          const winnerOrCandidate = state.players.find(p => (p.statusEffects?.kingForm || 0) > 0);
          let pulseIntensity = 0;
          if (winnerOrCandidate) {
            const progress = (winnerOrCandidate.statusEffects.kingForm || 0) / 1.5; // HOLD_TIME
            pulseIntensity = progress;
          }

          ringsGraphicsRef.current.clear();

          // Redraw rings with dynamic pulse
          const baseAlpha = 0.3;
          const pulse = Math.sin(t * (2.0 + pulseIntensity * 10.0)) * 0.2 * pulseIntensity; // Faster if closer

          // Outer Rings
          ringsGraphicsRef.current.circle(0, 0, RING_RADII.R2).stroke({ width: 4, color: COLOR_PALETTE.rings.r2, alpha: 0.3 });
          ringsGraphicsRef.current.circle(0, 0, RING_RADII.R1).stroke({ width: 2, color: COLOR_PALETTE.rings.r1, alpha: 0.2 });

          // Center Zone (Ring 3) - The Heart
          const centerColor = pulseIntensity > 0 ? 0xff0000 : COLOR_PALETTE.rings.r3;
          const centerWidth = pulseIntensity > 0 ? 8 + pulseIntensity * 10 : 4;

          ringsGraphicsRef.current.circle(0, 0, RING_RADII.R3).stroke({
            width: centerWidth,
            color: centerColor,
            alpha: 0.5 + pulse
          });

          if (pulseIntensity > 0.5) {
            // Critical hold visuals
            ringsGraphicsRef.current.circle(0, 0, RING_RADII.R3 * (1.0 - pulseIntensity * 0.1)).fill({
              color: 0xff0000,
              alpha: 0.1 + pulse * 0.2
            });
          }
        }
      });
    });

    return () => {
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  const initResources = () => {
    // ... same ...
    const geometry = new Geometry({
      attributes: {
        aVertexPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
        aUvs: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3]
    });
    geometryCache.current = geometry;

    const shader = Shader.from({
      gl: { vertex: JELLY_VERTEX, fragment: JELLY_FRAGMENT },
      resources: {
        uTime: 0,
        uWobble: 0.1,
        uSquish: 0,
        uColor: [1, 1, 1],
        uAlpha: 1,
        uBorderColor: [0, 0, 0],
        uDeformMode: 0,
        uPatternMode: 0,
        uEmotion: 0,
        uEnergy: 0,
        uMatchPercent: 0.5,
        uPulsePhase: 0.0, // New Uniform
      }
    });
    shaderCache.current = shader;
  };

  const ringsGraphicsRef = useRef<Graphics | null>(null);

  const drawMap = (container: Container) => {
    const g = new Graphics();
    ringsGraphicsRef.current = g;

    // Draw Static Rings first
    g.circle(0, 0, RING_RADII.R3).stroke({ width: 4, color: COLOR_PALETTE.rings.r3, alpha: 0.5 });
    g.circle(0, 0, RING_RADII.R2).stroke({ width: 4, color: COLOR_PALETTE.rings.r2, alpha: 0.3 });
    g.circle(0, 0, RING_RADII.R1).stroke({ width: 2, color: COLOR_PALETTE.rings.r1, alpha: 0.2 });

    // Win Zone Membrane (Inner)
    // We'll update this in render loop for pulsing

    container.addChild(g);
  };

  const syncEntities = (container: Container, state: GameState, time: number, alpha: number) => {
    const activeIds = new Set<string>();
    const all = [...state.players, ...state.bots, ...state.food];

    all.forEach(e => {
      if (e.isDead) return;
      activeIds.add(e.id);

      let mesh = meshesRef.current.get(e.id);

      if (!mesh) {
        if ('score' in e) {
          if (USE_SHADERS && geometryCache.current && shaderCache.current) {
            mesh = new Mesh({
              geometry: geometryCache.current,
              shader: shaderCache.current
            });
            (mesh as any).shader = Shader.from({
              gl: { vertex: JELLY_VERTEX, fragment: JELLY_FRAGMENT },
              resources: {
                uTime: 0, uWobble: 0.05, uSquish: 0, uColor: [1, 1, 1],
                uAlpha: 1, uBorderColor: [0, 0, 0], uDeformMode: 0,
                uPatternMode: 0, uEmotion: 0, uMatchPercent: 0.5
              }
            });
          } else {
            const g = new Graphics();
            g.circle(0, 0, e.radius);
            g.fill(0xffffff);
            mesh = g;
          }
        } else {
          const g = new Graphics();
          if ((e as any).kind === 'pigment') g.circle(0, 0, e.radius).fill(0xffffff);
          else if ((e as any).kind === 'candy_vein') g.star(0, 0, 5, e.radius * 1.5, e.radius).fill(0xffd700);
          else g.rect(-e.radius / 2, -e.radius / 2, e.radius, e.radius).fill(0x888888);
          mesh = g;
        }
        container.addChild(mesh);
        meshesRef.current.set(e.id, mesh);
      }

      // INTERPOLATION LOGIC
      if (!e.prevPosition) {
        // Fail fast as per Eidolon mandate
        console.error(`Entity ${e.id} missing prevPosition! Lifecycle breach.`);
        e.prevPosition = { ...e.position }; // Recovery
      }
      const prev = e.prevPosition;
      const curr = e.position;

      const x = prev.x + (curr.x - prev.x) * alpha;
      const y = prev.y + (curr.y - prev.y) * alpha;

      mesh.position.x = x;
      mesh.position.y = y;

      if (mesh instanceof Mesh) {
        const scale = e.radius;
        mesh.scale.set(scale);

        if (mesh.shader && mesh.shader.resources) {
          const res = mesh.shader.resources;
          res.uTime = time + (x * 0.01);

          const colorHex = e.color || '#ffffff';
          const val = parseInt(colorHex.replace('#', ''), 16);
          res.uColor[0] = ((val >> 16) & 255) / 255;
          res.uColor[1] = ((val >> 8) & 255) / 255;
          res.uColor[2] = (val & 255) / 255;

          const speed = Math.hypot(e.velocity.x, e.velocity.y);
          if (res.uSquish !== undefined) {
            const newSquish = Math.min(0.3, speed / 500);
            if (Math.abs(res.uSquish - newSquish) > 0.01) res.uSquish = newSquish;
          }

          let deform = 0;
          let pattern = 0;
          let emotionVal = 0;
          let matchVal = 0.5;

          if (isPlayerOrBot(e)) {
            // ... (keep logic) ...
            const tattoos = e.tattoos as string[] || [];
            if (tattoos.includes('grim_harvest') || tattoos.includes('invulnerable')) deform = 1;
            if ((e.statusEffects?.overdriveTimer || 0) > 0 || tattoos.includes('pigment_bomb')) pattern = 1;
            if (tattoos.includes('lightning')) pattern = 2;

            const map: Record<string, number> = { 'happy': 0, 'hungry': 1, 'panic': 2, 'greed': 3 };
            emotionVal = map[e.emotion] || 0;

            // Boss Telegraph
            if ('isBoss' in e && (e as any).isBoss) {
              const bot = e as any;
              if (bot.bossAttackTimer !== undefined && bot.bossAttackTimer < 1.0 && bot.bossAttackTimer > 0) {
                emotionVal = 3;
              }
            }
            matchVal = e.matchPercent || 0;
          }

          if (res.uEmotion !== emotionVal) res.uEmotion = emotionVal;
          if (Math.abs(res.uMatchPercent - matchVal) > 0.01) res.uMatchPercent = matchVal;
          if (Math.abs(res.uEnergy - matchVal) > 0.01) res.uEnergy = matchVal;
          if (res.uDeformMode !== deform) res.uDeformMode = deform;
          if (res.uPatternMode !== pattern) res.uPatternMode = pattern;
        }
      } else if (mesh instanceof Graphics) {
        if (mesh.tint !== parseInt(e.color?.replace('#', '') || 'ffffff', 16)) {
          mesh.tint = parseInt(e.color?.replace('#', '') || 'ffffff', 16);
        }
      }
    });

    for (const [id, m] of meshesRef.current) {
      if (!activeIds.has(id)) {
        container.removeChild(m);
        m.destroy();
        meshesRef.current.delete(id);
      }
    }
  };



  const syncParticles = (container: Container, particles: Particle[], time: number, alpha: number) => {
    // Initialize Batch Graphics if needed
    if (!particleLayerRef.current) {
      const g = new Graphics();
      g.blendMode = 'add'; // Global bloom for all particles
      container.addChild(g);
      particleLayerRef.current = g;
    }

    const g = particleLayerRef.current;
    g.clear(); // Batch render: Clear once

    particles.forEach(p => {
      // Safety: If particle is newly created, prev might be undefined.
      if (!p.prevPosition) {
        p.prevPosition = { ...p.position };
      }

      const prev = p.prevPosition;
      const curr = p.position;

      const px = prev.x + (curr.x - prev.x) * alpha;
      const py = prev.y + (curr.y - prev.y) * alpha;

      const alphaVal = p.fadeOut ? (p.life / (p.maxLife || 1)) : 1;
      // Convert hex string to number
      const color = parseInt(p.color.replace('#', ''), 16);

      // Render Loop (Immediate Mode)
      if ((p as any).isRipple) {
        const r = (p as any).rippleRadius || p.radius;
        g.circle(px, py, r).stroke({ width: 2, color, alpha: alphaVal * 0.6 });
      } else if ((p as any).isPulse) {
        const r = (p as any).pulseRadius || p.radius;
        g.circle(px, py, r).fill({ color, alpha: alphaVal * 0.3 });
        g.circle(px, py, r * 0.7).stroke({ width: 1, color, alpha: alphaVal * 0.8 });
      } else if ((p as any).isShockwave) {
        const r = (p as any).shockwaveRadius || p.radius;
        g.circle(px, py, r).stroke({ width: 4, color, alpha: alphaVal * 0.5 });
      } else if ((p as any).isLightRay) {
        const len = (p as any).rayLength || 50;
        const wid = (p as any).rayWidth || 2;
        // Rotation support for batch graphics? 
        // Graphics context supports rotation transform but it's stateful.
        // Easier to compute vertices for rect manually or use line.
        // Let's use MoveTo/LineTo for Ray to handle rotation easily.
        const angle = Math.atan2(p.velocity.y, p.velocity.x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Draw rotated rect line
        g.moveTo(px, py);
        g.lineTo(px + cos * len, py + sin * len).stroke({ width: wid, color, alpha: alphaVal });
      } else if ((p as any).isText) {
        // Skip text in batch graphics
      } else {
        // Dot
        g.circle(px, py, p.radius * (p.scale || 1)).fill({ color, alpha: alphaVal });
      }
    });
  };

  const setupInputs = (app: Application, stateRef: any, world: Container) => {
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', (e) => {
      if (!inputEnabled || !stateRef.current?.player) return;
      const state = stateRef.current;
      const center = { x: app.screen.width / 2, y: app.screen.height / 2 };
      const dx = e.global.x - center.x;
      const dy = e.global.y - center.y;
      state.player.targetPosition = {
        x: state.camera.x + dx,
        y: state.camera.y + dy
      };
    });
    app.stage.on('pointerdown', () => { if (stateRef.current) stateRef.current.inputs.space = true; });
    app.stage.on('pointerup', () => { if (stateRef.current) stateRef.current.inputs.space = false; });
  };

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-gray-900" />;
};


export default PixiGameCanvas;
