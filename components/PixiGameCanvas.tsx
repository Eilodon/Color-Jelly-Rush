
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
  const particleGraphicsRef = useRef<Map<string, Graphics>>(new Map());
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

        // VFX / UI
        if (ringsGraphicsRef.current) {
          const t = app.ticker.lastTime / 1000;
          ringsGraphicsRef.current.alpha = 0.8 + Math.sin(t * 2.0) * 0.2;
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
      }
    });
    shaderCache.current = shader;
  };

  const ringsGraphicsRef = useRef<Graphics | null>(null);

  const drawMap = (container: Container) => {
    const g = new Graphics();
    ringsGraphicsRef.current = g;
    g.circle(0, 0, RING_RADII.R3).stroke({ width: 4, color: COLOR_PALETTE.rings.r3, alpha: 0.5 });
    g.circle(0, 0, RING_RADII.R2).stroke({ width: 4, color: COLOR_PALETTE.rings.r2, alpha: 0.3 });
    g.circle(0, 0, RING_RADII.R1).stroke({ width: 2, color: COLOR_PALETTE.rings.r1, alpha: 0.2 });
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
      // If no prevPosition (newly spawned), use current.
      const prev = e.prevPosition || e.position;
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
          res.uSquish = Math.min(0.3, speed / 500);

          let deform = 0;
          let pattern = 0;
          let emotionVal = 0;
          let matchVal = 0.5;

          if (isPlayerOrBot(e)) {
            // Tattoos (Using string literals that match Enum or casting)
            // Ideally import TattooId but for now we fix the linter error by checking string validity or casting
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

          res.uEmotion = emotionVal;
          res.uMatchPercent = matchVal;
          res.uEnergy = matchVal;
          res.uDeformMode = deform;
          res.uPatternMode = pattern;
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
    const activeIds = new Set<string>();

    particles.forEach(p => {
      if (p.isDead) return;
      activeIds.add(p.id);

      let g = particleGraphicsRef.current.get(p.id);
      if (!g) {
        g = new Graphics();
        g.blendMode = 'add'; // Bloom effect
        container.addChild(g);
        particleGraphicsRef.current.set(p.id, g);
      }

      // Render Logic based on Particle Type
      g.clear();

      const color = parseInt(p.color.replace('#', ''), 16);
      const alphaVal = p.fadeOut ? (p.life / (p.maxLife || 1)) : 1;

      if ((p as any).isRipple) {
        // Ripple Ring
        const r = (p as any).rippleRadius || p.radius;
        g.circle(0, 0, r).stroke({ width: 2, color, alpha: alphaVal * 0.6 });
      } else if ((p as any).isPulse) {
        // Pulse
        const r = (p as any).pulseRadius || p.radius;
        g.circle(0, 0, r).fill({ color, alpha: alphaVal * 0.3 });
        g.circle(0, 0, r * 0.7).stroke({ width: 1, color, alpha: alphaVal * 0.8 });
      } else if ((p as any).isShockwave) {
        // Shockwave
        const r = (p as any).shockwaveRadius || p.radius;
        g.circle(0, 0, r).stroke({ width: 4, color, alpha: alphaVal * 0.5 });
      } else if ((p as any).isLightRay) {
        // Ray
        const len = (p as any).rayLength || 50;
        const wid = (p as any).rayWidth || 2;
        g.rect(0, -wid / 2, len, wid).fill({ color, alpha: alphaVal });
        // Rotate to velocity? calculated in update usually, here we interpret p.angle or velocity
        const angle = Math.atan2(p.velocity.y, p.velocity.x);
        g.rotation = angle;
      } else if ((p as any).isText) {
        // Text is handled by floatingTexts loop in engine, or strictly here?
        // vfxSystem pushes text as particle with isText?
        // If so, we can't easily use Graphics for text. Skip or Implement Text?
        // Let's implement basic circle for now to avoid complexity or use Text if imported
        // Ideally floating texts are separate list in state.
      } else {
        // Standard Dot
        g.circle(0, 0, p.radius * (p.scale || 1)).fill({ color, alpha: alphaVal });
      }

      // Position (Interpolated)
      // Particles usually don't have prevPosition set reliably in factories unless we did it?
      // Factory `createParticle` sets prev? Let's assume naive position for particles is fine for Juice
      // Or use prev if available.
      const prev = p.prevPosition || p.position; // Factories usually set this now?
      const curr = p.position;
      // If factory doesn't set prevPosition on spawn, interpolation might glitch on first frame (fly in from 0)
      // But let's try strict interpolation.

      // Safety: If particle is newly created, prev might be undefined.
      const px = prev ? (prev.x + (curr.x - prev.x) * alpha) : curr.x;
      const py = prev ? (prev.y + (curr.y - prev.y) * alpha) : curr.y;

      g.x = px;
      g.y = py;
    });

    // Cleanup
    for (const [id, g] of particleGraphicsRef.current) {
      if (!activeIds.has(id)) {
        container.removeChild(g);
        g.destroy();
        particleGraphicsRef.current.delete(id);
      }
    }
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
