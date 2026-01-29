import React, { useEffect, useRef } from 'react';
import { Application, Geometry, Mesh, Shader, GlProgram as Program } from 'pixi.js';
import { GameState } from '../types';
import { JELLY_VERTEX, JELLY_FRAGMENT } from '../services/cjr/shaders';

interface PixiGameCanvasProps {
    gameStateRef: React.RefObject<GameState | null>;
    inputEnabled: boolean;
    alphaRef: React.MutableRefObject<number>;
}

const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({ gameStateRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const jellyRef = useRef<Mesh | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Pixi App
        const app = new Application();

        // Pixi v8 init is async
        app.init({
            resizeTo: containerRef.current,
            backgroundAlpha: 0,
            preference: 'webgl'
        }).then(() => {
            containerRef.current?.appendChild(app.canvas as HTMLCanvasElement);
            appRef.current = app;

            // Setup Shader
            const geometry = new Geometry({
                attributes: {
                    aVertexPosition: [-100, -100, 100, -100, 100, 100, -100, 100],
                    aUvs: [0, 0, 1, 0, 1, 1, 0, 1]
                },
                indexBuffer: [0, 1, 2, 0, 2, 3]
            });

            const glProgram = new Program({
                vertex: JELLY_VERTEX,
                fragment: JELLY_FRAGMENT,
            });

            const shader = new Shader({
                glProgram,
                resources: {
                    uniforms: {
                        uTime: { value: 0, type: 'f32' },
                        uAberration: { value: 0, type: 'f32' }, // Phase 3.2 Verification
                        uColor: { value: [0, 1, 1], type: 'vec3<f32>' },
                        uAlpha: { value: 1, type: 'f32' },
                        uEnergy: { value: 1, type: 'f32' },
                        uSquish: { value: 0, type: 'f32' },
                        uPulsePhase: { value: 0, type: 'f32' },
                        uPatternMode: { value: 0, type: 'i32' },
                        uDeformMode: { value: 0, type: 'i32' },
                        translationMatrix: { value: [1, 0, 0, 0, 1, 0, 0, 0, 1], type: 'mat3x3<f32>' },
                        projectionMatrix: { value: [1, 0, 0, 0, 1, 0, 0, 0, 1], type: 'mat3x3<f32>' }
                    }
                }
            });

            const mesh = new Mesh({
                geometry,
                shader
            });

            mesh.position.set(window.innerWidth / 2, window.innerHeight / 2);
            app.stage.addChild(mesh);
            jellyRef.current = mesh as any;

            // Render Loop
            app.ticker.add(() => {
                const state = gameStateRef.current;
                if (!state || !state.player || !mesh.shader) return;

                const player = state.player;

                // VERIFICATION: Pass Aberration Uniform
                // Note: v8 resources.uniforms access might differ slightly depending on adapter
                // but usually works via direct object modification if SharedUniforms are used.
                // For v8 strict:
                mesh.shader.resources.uniforms.uniforms.uAberration = player.aberrationIntensity || 0;
                mesh.shader.resources.uniforms.uniforms.uTime = state.gameTime || 0;

                // EIDOLON-V: Update Color
                const c = player.color as number; // It's integer now
                const r = ((c >> 16) & 255) / 255;
                const g = ((c >> 8) & 255) / 255;
                const b = (c & 255) / 255;
                mesh.shader.resources.uniforms.uniforms.uColor = [r, g, b];
            });
        });

        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
                appRef.current = null;
            }
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0" />;
};

export default PixiGameCanvas;
