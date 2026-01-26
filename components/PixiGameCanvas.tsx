<<<<<<< Updated upstream

import React, { useEffect, useRef } from 'react';
import { Application, Container, Geometry, Shader, Mesh, Texture, Graphics, Text, TextStyle } from 'pixi.js';
import { GameState, Entity } from '../types';
import { MAP_RADIUS } from '../constants';
import { RING_RADII, COLOR_PALETTE } from '../services/cjr/cjrConstants';
import { calcMatchPercent, pigmentToHex } from '../services/cjr/colorMath';
import { JELLY_VERTEX, JELLY_FRAGMENT } from '../services/cjr/shaders';

// Performance Configuration
const USE_SHADERS = true; // Feature flag for rollout
const WORLD_SCALE = 1.0;
=======
import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Mesh, Geometry, Shader, Texture } from 'pixi.js';
import { GameState, isPlayerOrBot } from '../types';
import { TattooId } from '../services/cjr/cjrTypes';
import { CrystalVFX } from '../services/vfx/CrystalVFX';
import { COLOR_PALETTE, RING_RADII } from '../services/cjr/cjrConstants';
import { JELLY_VERTEX, JELLY_FRAGMENT } from '../services/cjr/shaders';
>>>>>>> Stashed changes

interface PixiGameCanvasProps {
  gameStateRef: React.MutableRefObject<GameState | null>;
  inputEnabled: boolean;
<<<<<<< Updated upstream
=======
  alphaRef: React.MutableRefObject<number>;
>>>>>>> Stashed changes
}

const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({ gameStateRef, inputEnabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const vfxRef = useRef<CrystalVFX | null>(null);

<<<<<<< Updated upstream
  // Entity Pools / caches
  const meshesRef = useRef<Map<string, Mesh | Container>>(new Map());
=======
  // Caches
>>>>>>> Stashed changes
  const geometryCache = useRef<Geometry | null>(null);
  const shaderCache = useRef<Shader | null>(null);
  const meshesRef = useRef<Map<string, Mesh | Graphics>>(new Map());
  const cameraSmoothRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    // 1. Init Pixi App
    const app = new Application();
    app.init({
      background: COLOR_PALETTE.background, // Render background directly
      resizeTo: window,
<<<<<<< Updated upstream
      antialias: true,
      resolution: window.devicePixelRatio || 1,
=======
      antialias: false,
      resolution: Math.min(window.devicePixelRatio, 1.5),
      autoDensity: true,
      preference: 'webgl',
>>>>>>> Stashed changes
    }).then(() => {
      if (!containerRef.current) { app.destroy(); return; }
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

<<<<<<< Updated upstream
      // Init Shared Resources
=======
      // Init Resources like geometry/shaders
>>>>>>> Stashed changes
      initResources();

      // 2. Setup Scene Graph
      // Camera Container: Holds World Content
      const cameraContainer = new Container();
      cameraContainer.label = 'Camera';

      // Center camera container on screen
      cameraContainer.x = app.screen.width / 2;
      cameraContainer.y = app.screen.height / 2;
      app.stage.addChild(cameraContainer);

      // --- LAYER 0: BACKGROUND (Unified) ---
      const bgLayer = new Container();
      cameraContainer.addChild(bgLayer);

      // Simple Dust Particles for Background
      const dustGraphics = new Graphics();
      bgLayer.addChild(dustGraphics);
      const dustParticles = Array.from({ length: 50 }, () => ({
        x: (Math.random() - 0.5) * 3000,
        y: (Math.random() - 0.5) * 3000,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1
      }));
      // Pre-draw dust (static for now, or animated in loop)
      dustParticles.forEach(p => {
        dustGraphics.circle(p.x, p.y, p.size).fill({ color: 0xffffff, alpha: p.alpha });
      });

      // --- LAYER 1: MAP (Rings) ---
      const mapGraphics = new Graphics();
      bgLayer.addChild(mapGraphics);

      // --- LAYER 2: ENTITIES (Food, Players) ---
      const entityLayer = new Container();
      entityLayer.sortableChildren = true;
      cameraContainer.addChild(entityLayer);

<<<<<<< Updated upstream
      const uiLayer = new Container();
      app.stage.addChild(uiLayer); // UI stays on screen

      // Input Handling
      setupInputs(app, gameStateRef, world);

      // Game Loop
=======
      // --- LAYER 3: VFX (Explosions) ---
      const vfx = new CrystalVFX(app);
      vfxRef.current = vfx;
      cameraContainer.addChild(vfx.getContainer());

      // 3. Input Handling
      setupInputs(app, gameStateRef, inputEnabled);

      // 4. Render Loop
>>>>>>> Stashed changes
      app.ticker.add((ticker) => {
        const state = gameStateRef.current;
        if (!state || !state.player) return;
        const dt = ticker.deltaTime / 60; // Approximate dt in seconds

<<<<<<< Updated upstream
        // Camera (Lerp)
        const targetX = -state.camera.x + app.screen.width / 2;
        const targetY = -state.camera.y + app.screen.height / 2;
        world.x += (targetX - world.x) * 0.1;
        world.y += (targetY - world.y) * 0.1;

        // Render Entities
        syncEntities(entityLayer, state, app.ticker.lastTime / 1000);

        // VFX / UI
        // (Previous particle system logic can be ported here, kept simple for this step)
=======
        const dt = ticker.deltaTime / 60;
        const alpha = alphaRef.current;

        // -- CAMERA LOGIC --
        const p = state.player;
        // Interpolate player for smoother camera target
        const pX = p.prevPosition ? (p.prevPosition.x + (p.position.x - p.prevPosition.x) * alpha) : p.position.x;
        const pY = p.prevPosition ? (p.prevPosition.y + (p.position.y - p.prevPosition.y) * alpha) : p.position.y;

        // Target is opposite of player position to center them
        const targetX = -pX;
        const targetY = -pY;

        // Camera Smoothing
        cameraSmoothRef.current.x += (targetX - cameraSmoothRef.current.x) * 0.1;
        cameraSmoothRef.current.y += (targetY - cameraSmoothRef.current.y) * 0.1;

        // Apply to container (centering offset is already applied to container x/y initial)
        // Actually, if we set container.x/y to screen center, we just need to add camera offset.
        // But here we want `cameraContainer` to move relative to its center.
        // The container is at screen center. Its children should be offset by camera.
        // Easier: Move `cameraContainer` pivot? Or just move it.
        // If container is at Center, setting x/y moves it away.
        // Let's keep container at Center, and modify its pivot or position?
        // "cameraContainer.x = Center + CamOffset"

        // Correct approach:
        // CameraContainer position = ScreenCenter + CameraOffset (smoothed)
        cameraContainer.x = (app.screen.width / 2) + cameraSmoothRef.current.x;
        cameraContainer.y = (app.screen.height / 2) + cameraSmoothRef.current.y;

        // Parallax Background (Optional)
        // Move bgLayer slightly opposite to create depth? Or just keep it synced for now.

        // -- RENDER UPDATES --
        drawRings(mapGraphics, state.gameTime);

        // Sync Entities
        syncEntities(entityLayer, state, app.ticker.lastTime / 1000, alpha);

        // -- VFX EVENTS --
        processVfxEvents(state, vfx);
        vfx.update(dt);
>>>>>>> Stashed changes
      });
    });

    return () => {
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  const initResources = () => {
<<<<<<< Updated upstream
    // Create shared Geometry for a Quad (Player)
    // 0--1
    // |  |
    // 3--2
=======
>>>>>>> Stashed changes
    const geometry = new Geometry({
      attributes: {
        aVertexPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
        aUvs: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3]
    });
    geometryCache.current = geometry;

<<<<<<< Updated upstream
    // Compile Shader
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
      }
    });
    shaderCache.current = shader;
  };

  const drawMap = (container: Container) => {
    const g = new Graphics();

    // Ring 3 (Death)
    g.circle(0, 0, RING_RADII.R3).stroke({ width: 4, color: COLOR_PALETTE.rings.r3, alpha: 0.5 });

    // Ring 2 (Mid)
    g.circle(0, 0, RING_RADII.R2).stroke({ width: 4, color: COLOR_PALETTE.rings.r2, alpha: 0.3 });

    // Ring 1 (Outer) - Map Boundary
    g.circle(0, 0, RING_RADII.R1).stroke({ width: 2, color: COLOR_PALETTE.rings.r1, alpha: 0.2 });

    container.addChild(g);
  };

  const syncEntities = (container: Container, state: GameState, time: number) => {
    const activeIds = new Set<string>();

    // Combine lists: Players, Bots, Food
    // In Full implementation, we iterate strictly.
    const all = [...state.players, ...state.bots, ...state.food];

    all.forEach(e => {
      if (e.isDead) return;
      activeIds.add(e.id);

      let mesh = meshesRef.current.get(e.id);

      if (!mesh) {
        // New Entity
        if ('score' in e) { // Player/Bot -> USE SHADER
          if (USE_SHADERS && geometryCache.current && shaderCache.current) {
            mesh = new Mesh({
              geometry: geometryCache.current,
              shader: shaderCache.current // We need to clone wrapper to set unique uniforms? 
              // Pixi v8 Shader resources are shared. We usually use a material concept.
              // For simplicity in Pixi, we can clone shader or use Mesh with specific uniforms.
              // Actually, in Pixi v8, shader state is robust.
              // Let's create a new Shader instance reusing the program for uniforms.
            });
            // Manual clone for uniforms
            (mesh as any).shader = Shader.from({
              gl: { vertex: JELLY_VERTEX, fragment: JELLY_FRAGMENT },
              resources: {
                uTime: 0,
                uWobble: 0.05,
                uSquish: 0,
                uColor: [1, 1, 1],
                uAlpha: 1,
                uBorderColor: [0, 0, 0],
                uDeformMode: 0,
                uPatternMode: 0
              }
            });
          } else {
            // Fallback
            const g = new Graphics();
            g.circle(0, 0, e.radius);
            g.fill(0xffffff);
            mesh = g;
          }
        } else {
          // Food -> Simple Graphics (Instancing later?)
          // Or use small Texture
          const g = new Graphics();

          // Pickup Shape
          if ((e as any).kind === 'pigment') g.circle(0, 0, e.radius).fill(0xffffff);
          else if ((e as any).kind === 'candy_vein') g.star(0, 0, 5, e.radius * 1.5, e.radius).fill(0xffd700);
          else g.rect(-e.radius / 2, -e.radius / 2, e.radius, e.radius).fill(0x888888);

          mesh = g;
        }
        container.addChild(mesh);
        meshesRef.current.set(e.id, mesh);
      }

      // Update Transform
      mesh.position.x = e.position.x;
      mesh.position.y = e.position.y;

      // Update Visuals
      if (mesh instanceof Mesh) {
        const scale = e.radius; // Shader quad is -1..1, so radius needed?
        // Quad size is 2x2. So scale = radius.
        mesh.scale.set(scale);

        // Set Uniforms - GUARDED CHECK
        if (mesh.shader && mesh.shader.resources) {
          const resources = mesh.shader.resources;
          resources.uTime = time + (e.position.x * 0.01); // Phase shift

          // Color Logic
          const colorHex = e.color || '#ffffff';
          const val = parseInt(colorHex.replace('#', ''), 16);
          resources.uColor[0] = ((val >> 16) & 255) / 255;
          resources.uColor[1] = ((val >> 8) & 255) / 255;
          resources.uColor[2] = (val & 255) / 255;

          // Wobble based on velocity
          const speed = Math.hypot(e.velocity.x, e.velocity.y);
          resources.uSquish = Math.min(0.3, speed / 500);

          // TATTOO VISUALS
          let deform = 0;
          let pattern = 0;

          if ('tattoos' in e) {
            const tattoos = (e as any).tattoos || []; // check type
            // Spikes for aggressive tattoos
            if (tattoos.includes('grim_harvest') || tattoos.includes('invulnerable') || tattoos.includes('pierce')) {
              deform = 1;
            }

            // Patterns
            if ((e as any).statusEffects?.overdriveTimer > 0 || tattoos.includes('pigment_bomb')) {
              pattern = 1; // Fire
            }
            if (tattoos.includes('lightning') || tattoos.includes('speed_surge')) {
              pattern = 2; // Electric
            }
          }
          resources.uDeformMode = deform;
          resources.uPatternMode = pattern;
        }

        // Emotion -> Texture? (Not implemented in Shader yet, overlay face sprite needed)
      } else if (mesh instanceof Graphics) {
        // Static/Simple update (Food)
        // Color update?
        if (mesh.tint !== parseInt(e.color?.replace('#', '') || 'ffffff', 16)) {
          mesh.tint = parseInt(e.color?.replace('#', '') || 'ffffff', 16);
        }
      }
    });

    // Cleanup
    for (const [id, m] of meshesRef.current) {
      if (!activeIds.has(id)) {
        container.removeChild(m);
        m.destroy();
        meshesRef.current.delete(id);
      }
    }
  };

  const setupInputs = (app: Application, stateRef: any, world: Container) => {
=======
    try {
      const shader = Shader.from({
        gl: { vertex: JELLY_VERTEX, fragment: JELLY_FRAGMENT },
        resources: {
          uTime: 0, uWobble: 0.1, uSquish: 0, uColor: [1, 1, 1],
          uAlpha: 1, uBorderColor: [0, 0, 0], uDeformMode: 0, uPatternMode: 0,
          uEmotion: 0, uEnergy: 0, uPulsePhase: 0.0,
        }
      });
      shaderCache.current = shader;
    } catch (e) {
      console.warn('Shader compile failed', e);
    }
  };

  const drawRings = (g: Graphics, time: number) => {
    g.clear();
    g.circle(0, 0, RING_RADII.R1).stroke({ width: 2, color: COLOR_PALETTE.rings.r1, alpha: 0.3 });
    g.circle(0, 0, RING_RADII.R2).stroke({ width: 4, color: COLOR_PALETTE.rings.r2, alpha: 0.5 });
    const pulse = Math.sin(time * 3) * 0.1;
    g.circle(0, 0, RING_RADII.R3).stroke({ width: 6 + pulse * 4, color: COLOR_PALETTE.rings.r3, alpha: 0.8 });
  };

  const setupInputs = (app: Application, stateRef: any, inputEnabled: boolean) => {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

    app.stage.on('pointerdown', () => {
      if (stateRef.current) stateRef.current.inputs.space = true;
    });
    app.stage.on('pointerup', () => {
      if (stateRef.current) stateRef.current.inputs.space = false;
=======
    app.stage.on('pointerdown', () => {
      if (stateRef.current && inputEnabled) stateRef.current.inputs.space = true;
    });
    app.stage.on('pointerup', () => {
      if (stateRef.current && inputEnabled) stateRef.current.inputs.space = false;
>>>>>>> Stashed changes
    });
  };

  const syncEntities = (container: Container, state: GameState, time: number, alpha: number) => {
    const activeIds = new Set<string>();
    const all = [...state.players, ...state.bots, ...state.food];

    all.forEach(e => {
      if (e.isDead) return;
      activeIds.add(e.id);

      let mesh = meshesRef.current.get(e.id);
      if (!mesh) {
        if ('score' in e && geometryCache.current && shaderCache.current) {
          // Shader Mesh for Player/Bot
          const entityShader = Shader.from({
            gl: { vertex: JELLY_VERTEX, fragment: JELLY_FRAGMENT },
            resources: {
              uTime: 0, uWobble: 0.1, uSquish: 0, uColor: [1, 1, 1],
              uAlpha: 1, uBorderColor: [0, 0, 0], uDeformMode: 0, uPatternMode: 0,
              uEmotion: 0, uEnergy: 0, uPulsePhase: 0.0,
            }
          });
          mesh = new Mesh({ geometry: geometryCache.current, shader: entityShader });
          // Set z-index for players/bots higher
          mesh.zIndex = 10;
        } else {
          // Graphics for Food
          const g = new Graphics();
          if ('value' in e) {
            if ((e as any).kind === 'candy_vein') {
              // Star shape
              g.poly([0, -e.radius,
                e.radius * 0.3, -e.radius * 0.3,
                e.radius, 0,
                e.radius * 0.3, e.radius * 0.3,
                0, e.radius,
                -e.radius * 0.3, e.radius * 0.3,
                -e.radius, 0,
                -e.radius * 0.3, -e.radius * 0.3
              ]).fill({ color: 0xffd700 });
            } else {
              g.circle(0, 0, e.radius).fill({ color: 0xffffff });
            }
          } else {
            g.circle(0, 0, e.radius).fill({ color: 0xffffff });
          }
          mesh = g;
          mesh.zIndex = 1;
        }
        container.addChild(mesh);
        meshesRef.current.set(e.id, mesh);
      }

      // Interpolation
      const prev = e.prevPosition || e.position;
      const curr = e.position;
      const x = prev.x + (curr.x - prev.x) * alpha;
      const y = prev.y + (curr.y - prev.y) * alpha;
      mesh.position.set(x, y);

      // Update Props (Shader/Tint)
      if (mesh instanceof Mesh && mesh.shader) {
        mesh.scale.set(e.radius);
        const res = mesh.shader.resources;
        res.uTime = time + x * 0.01;

        const colorHex = e.color || '#ffffff';
        const val = parseInt(colorHex.replace('#', ''), 16);
        res.uColor[0] = ((val >> 16) & 255) / 255;
        res.uColor[1] = ((val >> 8) & 255) / 255;
        res.uColor[2] = (val & 255) / 255;

        if (isPlayerOrBot(e)) {
          let deform = 0; let pattern = 0;
          const tattoos = e.tattoos || [];
          if (tattoos.includes(TattooId.GrimHarvest)) deform = 1;
          if (tattoos.includes(TattooId.Lightning)) pattern = 2;
          res.uDeformMode = deform;
          res.uPatternMode = pattern;
          res.uEnergy = e.matchPercent || 0;
        }
      } else if (mesh instanceof Graphics) {
        const colorHex = e.color || '#ffffff';
        const val = parseInt(colorHex.replace('#', ''), 16);
        if (mesh.tint !== val) mesh.tint = val;
      }
    });

    // Cleanup dead entities
    for (const [id, m] of meshesRef.current) {
      if (!activeIds.has(id)) {
        container.removeChild(m);
        m.destroy();
        meshesRef.current.delete(id);
      }
    }
  };

  const processVfxEvents = (state: GameState, vfx: CrystalVFX) => {
    while (state.vfxEvents.length > 0) {
      const evt = state.vfxEvents.shift();
      if (!evt) continue;
      const parts = evt.split(':');
      const type = parts[0];

      if (type === 'explode') {
        const [_, x, y, colorHex, count = '20'] = parts;
        vfx.explode(parseFloat(x), parseFloat(y), parseInt(colorHex.replace('#', ''), 16), parseInt(count));
      }
      else if (type === 'commit') {
        // commit:playerId:ringId
        // Find player to explode/shockwave at their position
        const pid = parts[1];
        const p = state.players.find(pl => pl.id === pid) || state.bots.find(b => b.id === pid);
        if (p) {
          const color = p.ring === 3 ? 0xff0000 : (p.ring === 2 ? 0x0000ff : 0x00ff00);
          vfx.shockwave(p.position.x, p.position.y, color);
          vfx.explode(p.position.x, p.position.y, 0xffd700, 50); // Gold explosion
        }
      }
      else if (type === 'tattoo') {
        // tattoo:playerId:tattooId
        const pid = parts[1];
        const p = state.players.find(pl => pl.id === pid);
        if (p) {
          vfx.spiral(p.position.x, p.position.y, 0xa855f7, 40); // Purple spiral
        }
      }
    }
  };

  return <div ref={containerRef} className="absolute inset-0" />;
};

export default PixiGameCanvas;
