
import React, { useEffect, useRef } from 'react';
import { Application, Container, Geometry, Graphics, Mesh, Shader, GlProgram as Program, Texture, Assets, Sprite } from 'pixi.js';
import { GameState, Entity, Player, Bot, Food, Projectile } from '../types';
import { JELLY_VERTEX, JELLY_FRAGMENT } from '../services/cjr/shaders';
import { MAP_RADIUS, WORLD_WIDTH, WORLD_HEIGHT, COLOR_PALETTE_HEX } from '../constants';
import { intToHex } from '../services/cjr/colorMath';
import { getInterpolatedPosition } from '../services/engine/RenderBridge';

const _renderPoint = { x: 0, y: 0 };

interface PixiGameCanvasProps {
    gameStateRef: React.RefObject<GameState | null>;
    inputEnabled: boolean;
    alphaRef: React.MutableRefObject<number>;
}

// EIDOLON-V: Object Pools for Zero-GC Rendering
class RenderPool<T extends Container> {
    private pool: T[] = [];
    private active: Map<string, T> = new Map();
    private factory: () => T;

    constructor(factory: () => T) {
        this.factory = factory;
    }

    get(id: string): T {
        let item = this.active.get(id);
        if (!item) {
            item = this.pool.pop() || this.factory();
            this.active.set(id, item);
            item.visible = true;
        }
        return item;
    }

    release(id: string) {
        const item = this.active.get(id);
        if (item) {
            item.visible = false;
            this.pool.push(item);
            this.active.delete(id);
        }
    }

    releaseAll() {
        for (const [id, item] of this.active) {
            item.visible = false;
            this.pool.push(item);
        }
        this.active.clear();
    }

    getActive(): Map<string, T> { return this.active; }
}

const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({ gameStateRef, alphaRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);

    // Layers
    const worldLayerRef = useRef<Container | null>(null);
    const gridLayerRef = useRef<Graphics | null>(null);
    const foodLayerRef = useRef<Container | null>(null);
    const unitLayerRef = useRef<Container | null>(null);
    const vfxLayerRef = useRef<Container | null>(null);
    const uiLayerRef = useRef<Container | null>(null);

    // Pools
    const foodPoolRef = useRef<RenderPool<Graphics> | null>(null);
    const projectilePoolRef = useRef<RenderPool<Graphics> | null>(null);
    const unitPoolRef = useRef<RenderPool<Mesh<Geometry, Shader>> | null>(null); // Units use Mesh for Shader
    const vfxPoolRef = useRef<RenderPool<Graphics> | null>(null);

    // Shared Shader
    const shaderRef = useRef<Shader | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const init = async () => {
            const app = new Application();
            await app.init({
                resizeTo: containerRef.current!,
                background: COLOR_PALETTE_HEX.background,
                antialias: true,
                preference: 'webgl'
            });

            containerRef.current?.appendChild(app.canvas);
            appRef.current = app;

            // 1. Setup Layer Hierarchy
            // Root Container for Camera Transform
            const world = new Container();
            worldLayerRef.current = world;
            app.stage.addChild(world);

            // Grid (Back)
            const grid = new Graphics();
            gridLayerRef.current = grid;
            world.addChild(grid);

            // Food (Below Units)
            const foodLayer = new Container();
            foodLayerRef.current = foodLayer;
            world.addChild(foodLayer);

            // Units (Players/Bots)
            const unitLayer = new Container();
            unitLayerRef.current = unitLayer;
            world.addChild(unitLayer);

            // Projectiles / VFX
            const vfxLayer = new Container();
            vfxLayerRef.current = vfxLayer;
            world.addChild(vfxLayer);

            // UI (Floating Text) - separate if needed, or in VFX
            const uiLayer = new Container();
            uiLayerRef.current = uiLayer;
            world.addChild(uiLayer);

            // 2. Setup Shaders (The Secret Sauce)
            const glProgram = new Program({
                vertex: JELLY_VERTEX,
                fragment: JELLY_FRAGMENT,
            });

            shaderRef.current = new Shader({
                glProgram,
                resources: {
                    uniforms: {
                        uTime: { value: 0, type: 'f32' },
                        uAberration: { value: 0, type: 'f32' },
                        uJellyColor: { value: [0, 1, 1], type: 'vec3<f32>' },
                        uAlpha: { value: 1, type: 'f32' },
                        uEnergy: { value: 1, type: 'f32' }, // Pulse
                        uSquish: { value: 0, type: 'f32' },
                        translationMatrix: { value: [1, 0, 0, 0, 1, 0, 0, 0, 1], type: 'mat3x3<f32>' },
                        projectionMatrix: { value: [1, 0, 0, 0, 1, 0, 0, 0, 1], type: 'mat3x3<f32>' }
                    }
                }
            });

            // 3. Initialize Pools
            foodPoolRef.current = new RenderPool(() => {
                const g = new Graphics();
                g.circle(0, 0, 10); // Radius updated per frame if needed
                g.fill(0xffffff);
                foodLayer.addChild(g);
                return g;
            });

            projectilePoolRef.current = new RenderPool(() => {
                const g = new Graphics();
                g.circle(0, 0, 5);
                g.fill(0xff0000);
                vfxLayer.addChild(g);
                return g;
            });

            unitPoolRef.current = new RenderPool(() => {
                // Quad Geometry for Shader
                const geometry = new Geometry({
                    attributes: {
                        position: [-1, -1, 1, -1, 1, 1, -1, 1], // Normalized quad
                        uv: [0, 0, 1, 0, 1, 1, 0, 1]
                    },
                    indexBuffer: [0, 1, 2, 0, 2, 3]
                });

                // Clone shader for individual uniforms (Color/Aberration)
                // Note: In Pixi v8, shader resources might be shared.
                // We'll see if we need unique shaders per mesh. Assuming yes for uniforms.
                const s = new Shader({
                    glProgram,
                    resources: {
                        uniforms: { ...shaderRef.current!.resources.uniforms }
                    }
                });

                const m = new Mesh({ geometry, shader: s, texture: Texture.WHITE });
                unitLayer.addChild(m);
                return m;
            });

            // 4. Draw Static Elements (Map Border)
            const border = new Graphics();
            border.arc(0, 0, MAP_RADIUS, 0, Math.PI * 2);
            border.stroke({ width: 20, color: 0x444444, alpha: 0.5 });
            world.addChild(border);

            // 5. Render Loop
            app.ticker.add((ticker) => {
                if (!gameStateRef.current) return;
                const state = gameStateRef.current;
                const dt = ticker.deltaTime / 60; // Approximate

                // A. Camera Logic
                const camX = state.camera.x;
                const camY = state.camera.y;

                world.position.set(
                    window.innerWidth / 2 - camX,
                    window.innerHeight / 2 - camY
                );

                // B. Dynamic Grid (Parallax/Culling)
                const g = gridLayerRef.current!;
                g.clear();
                g.strokeStyle = { width: 2, color: 0x222222, alpha: 0.3 };

                const gridSize = 200;
                // Cull grid to viewport
                const startX = Math.floor((camX - window.innerWidth / 2) / gridSize) * gridSize;
                const endX = startX + window.innerWidth + gridSize * 2;
                const startY = Math.floor((camY - window.innerHeight / 2) / gridSize) * gridSize;
                const endY = startY + window.innerHeight + gridSize * 2;

                g.beginPath();
                for (let x = startX; x <= endX; x += gridSize) {
                    g.moveTo(x, startY);
                    g.lineTo(x, endY);
                }
                for (let y = startY; y <= endY; y += gridSize) {
                    g.moveTo(startX, y);
                    g.lineTo(endX, y);
                }
                g.stroke();


                // C. Sync Entities
                const seenIds = new Set<string>();

                // Food
                for (const f of state.food) {
                    if (f.isDead) continue;
                    seenIds.add(f.id);
                    const gfx = foodPoolRef.current!.get(f.id);
                    const alpha = alphaRef.current;
                    const pos = getInterpolatedPosition(f.id, alpha, _renderPoint);
                    const fx = pos ? pos.x : f.position.x;
                    const fy = pos ? pos.y : f.position.y;
                    gfx.position.set(fx, fy);
                    gfx.clear();

                    // Style by kind
                    if (f.kind === 'catalyst') {
                        gfx.regularPoly(0, 0, f.radius, 6);
                        gfx.fill(0xd946ef); // Magenta
                    } else if (f.kind === 'shield') {
                        gfx.rect(-f.radius, -f.radius, f.radius * 2, f.radius * 2);
                        gfx.fill(0xfbbf24); // Gold
                    } else {
                        gfx.circle(0, 0, f.radius);
                        gfx.fill(f.color);
                    }
                }

                // Clean Missing Food
                for (const [id] of foodPoolRef.current!.getActive()) {
                    if (!seenIds.has(id)) foodPoolRef.current!.release(id);
                }
                seenIds.clear();

                // Units (Player + Bots)
                const units = [state.player, ...state.bots];
                for (const u of units) {
                    if (!u || u.isDead) continue;
                    seenIds.add(u.id);

                    const mesh = unitPoolRef.current!.get(u.id);
                    // Mesh is 2x2 normalized quad, scale it to Radius
                    const alpha = alphaRef.current;
                    const pos = getInterpolatedPosition(u.id, alpha, _renderPoint);
                    const ux = pos ? pos.x : u.position.x;
                    const uy = pos ? pos.y : u.position.y;
                    mesh.position.set(ux, uy);
                    mesh.scale.set(u.radius, u.radius);

                    // Update Shader Uniforms
                    // const uniforms = mesh.shader.resources.uniforms.uniforms; // Pixi v8
                    // Hack for V8 structure access if strict typing fails:
                    const anyShader = mesh.shader as any;
                    if (anyShader.resources && anyShader.resources.uniforms && anyShader.resources.uniforms.uniforms) {
                        const uData = anyShader.resources.uniforms.uniforms;

                        // Color
                        const c = u.color as number;
                        const r = ((c >> 16) & 255) / 255;
                        const g = ((c >> 8) & 255) / 255;
                        const b = (c & 255) / 255;

                        if (!uData.uJellyColor || !(uData.uJellyColor instanceof Float32Array) || uData.uJellyColor.length !== 3) {
                            uData.uJellyColor = new Float32Array(3);
                        }
                        uData.uJellyColor[0] = r;
                        uData.uJellyColor[1] = g;
                        uData.uJellyColor[2] = b;

                        // Juice
                        uData.uTime = state.gameTime;
                        uData.uAberration = u.aberrationIntensity || 0;
                        uData.uEnergy = (u.currentHealth / u.maxHealth);
                    }
                }

                // Clean Missing Units
                for (const [id] of unitPoolRef.current!.getActive()) {
                    if (!seenIds.has(id)) unitPoolRef.current!.release(id);
                }
                seenIds.clear();

                // Projectiles
                for (const p of state.projectiles) {
                    if (p.isDead) continue;
                    seenIds.add(p.id);
                    const gfx = projectilePoolRef.current!.get(p.id);
                    const alpha = alphaRef.current;
                    const pos = getInterpolatedPosition(p.id, alpha, _renderPoint);
                    const px = pos ? pos.x : p.position.x;
                    const py = pos ? pos.y : p.position.y;
                    gfx.position.set(px, py);
                    // Simple redraw or cache
                    gfx.clear();
                    gfx.circle(0, 0, p.radius);
                    gfx.fill(0xff0000);
                }
                // Clean Missing Projectiles
                for (const [id] of projectilePoolRef.current!.getActive()) {
                    if (!seenIds.has(id)) projectilePoolRef.current!.release(id);
                }

            });
        };

        init();

        return () => {
            appRef.current?.destroy(true, { children: true });
            appRef.current = null;
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 bg-black" />;
};

export default PixiGameCanvas;
