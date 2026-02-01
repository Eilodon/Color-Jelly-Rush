
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

// EIDOLON-V: FixedRenderPool - Cursor-based Zero-Allocation Pool
// Pattern: Pre-allocate + Cursor index = No .pop() fragmentation, No Map overhead
class FixedRenderPool<T extends Container> {
    private pool: T[] = [];
    private activeIndex: number = 0;
    private factory: () => T;

    constructor(initialSize: number, factory: () => T) {
        this.factory = factory;
        // Pre-allocate entire pool upfront - eliminates runtime allocations
        for (let i = 0; i < initialSize; i++) {
            const item = factory();
            item.visible = false;
            this.pool.push(item);
        }
    }

    get(): T {
        if (this.activeIndex >= this.pool.length) {
            // Emergency expansion - should rarely trigger if initialSize is calibrated
            const item = this.factory();
            this.pool.push(item);
        }
        const item = this.pool[this.activeIndex++];
        item.visible = true;
        return item;
    }

    reset(): void {
        // O(activeIndex) visibility toggle - much faster than Map iteration
        for (let i = 0; i < this.activeIndex; i++) {
            this.pool[i].visible = false;
        }
        this.activeIndex = 0;
    }

    getActiveCount(): number {
        return this.activeIndex;
    }
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

    // Pools - FixedRenderPool with cursor pattern for zero-GC rendering
    const foodPoolRef = useRef<FixedRenderPool<Graphics> | null>(null);
    const projectilePoolRef = useRef<FixedRenderPool<Graphics> | null>(null);
    const unitPoolRef = useRef<FixedRenderPool<Mesh<Geometry, Shader>> | null>(null);
    const vfxPoolRef = useRef<FixedRenderPool<Graphics> | null>(null);

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

            // 3. Initialize Pools with Pre-allocation
            // Pool sizes calibrated for typical gameplay scenarios
            const FOOD_POOL_SIZE = 200;
            const PROJECTILE_POOL_SIZE = 50;
            const UNIT_POOL_SIZE = 32; // Player + Bots

            foodPoolRef.current = new FixedRenderPool(FOOD_POOL_SIZE, () => {
                const g = new Graphics();
                g.circle(0, 0, 10);
                g.fill(0xffffff);
                foodLayer.addChild(g);
                return g;
            });

            projectilePoolRef.current = new FixedRenderPool(PROJECTILE_POOL_SIZE, () => {
                const g = new Graphics();
                g.circle(0, 0, 5);
                g.fill(0xff0000);
                vfxLayer.addChild(g);
                return g;
            });

            unitPoolRef.current = new FixedRenderPool(UNIT_POOL_SIZE, () => {
                // Quad Geometry for Shader
                const geometry = new Geometry({
                    attributes: {
                        position: [-1, -1, 1, -1, 1, 1, -1, 1],
                        uv: [0, 0, 1, 0, 1, 1, 0, 1]
                    },
                    indexBuffer: [0, 1, 2, 0, 2, 3]
                });

                // Clone shader for individual uniforms
                const s = new Shader({
                    glProgram,
                    resources: {
                        uniforms: { ...shaderRef.current!.resources.uniforms }
                    }
                });

                const m = new Mesh({ geometry, shader: s, texture: Texture.WHITE });

                // CRITICAL: Pre-initialize uJellyColor as Float32Array ONCE at creation
                // This eliminates runtime allocation in render loop
                const uData = (m.shader.resources.uniforms as any).uniforms;
                if (uData) {
                    uData.uJellyColor = new Float32Array([0, 0, 0]);
                }

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


                // C. Reset Pools - Cursor pattern eliminates cleanup loops
                foodPoolRef.current!.reset();
                unitPoolRef.current!.reset();
                projectilePoolRef.current!.reset();

                // D. Render Food
                for (const f of state.food) {
                    if (f.isDead) continue;
                    const gfx = foodPoolRef.current!.get();
                    const interpAlpha = alphaRef.current;
                    const pos = getInterpolatedPosition(f.id, interpAlpha, _renderPoint);
                    gfx.position.set(pos ? pos.x : f.position.x, pos ? pos.y : f.position.y);
                    gfx.clear();

                    // Style by kind
                    if (f.kind === 'catalyst') {
                        gfx.regularPoly(0, 0, f.radius, 6);
                        gfx.fill(0xd946ef);
                    } else if (f.kind === 'shield') {
                        gfx.rect(-f.radius, -f.radius, f.radius * 2, f.radius * 2);
                        gfx.fill(0xfbbf24);
                    } else {
                        gfx.circle(0, 0, f.radius);
                        gfx.fill(f.color);
                    }
                }

                // E. Render Units (Player + Bots)
                const units = [state.player, ...state.bots];
                for (const u of units) {
                    if (!u || u.isDead) continue;

                    const mesh = unitPoolRef.current!.get();
                    const interpAlpha = alphaRef.current;
                    const pos = getInterpolatedPosition(u.id, interpAlpha, _renderPoint);
                    mesh.position.set(pos ? pos.x : u.position.x, pos ? pos.y : u.position.y);
                    mesh.scale.set(u.radius, u.radius);

                    // Update Shader Uniforms - Direct mutation, ZERO allocation
                    const uData = (mesh.shader as any).resources?.uniforms?.uniforms;
                    if (uData) {
                        // Color extraction via bitwise - no allocation
                        const c = u.color as number;
                        // Direct mutation of pre-allocated Float32Array
                        uData.uJellyColor[0] = ((c >> 16) & 255) / 255;
                        uData.uJellyColor[1] = ((c >> 8) & 255) / 255;
                        uData.uJellyColor[2] = (c & 255) / 255;

                        // Juice parameters
                        uData.uTime = state.gameTime;
                        uData.uAberration = u.aberrationIntensity || 0;
                        uData.uEnergy = u.currentHealth / u.maxHealth;
                    }
                }

                // F. Render Projectiles
                for (const p of state.projectiles) {
                    if (p.isDead) continue;
                    const gfx = projectilePoolRef.current!.get();
                    const interpAlpha = alphaRef.current;
                    const pos = getInterpolatedPosition(p.id, interpAlpha, _renderPoint);
                    gfx.position.set(pos ? pos.x : p.position.x, pos ? pos.y : p.position.y);
                    gfx.clear();
                    gfx.circle(0, 0, p.radius);
                    gfx.fill(0xff0000);
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
