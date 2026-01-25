
import React, { useEffect, useRef } from 'react';
import { aaaVisualEngine } from '../services/visuals/AAAVisualEngine';
import { GameState } from '../types';

interface BackgroundCanvasProps {
    gameStateRef: React.MutableRefObject<GameState | null>;
}

const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ gameStateRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<any>(null); // Type 'any' for now to avoid complexity of importing class instance type if not exported perfectly
    const requestRef = useRef<number>(0);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Engine
        const engine = new aaaVisualEngine.AAAVisualEngine(canvasRef.current);
        engineRef.current = engine;

        // Setup Liquid/Space Background
        // We can use the 'explosion' or similar particle systems to create ambient dust?
        // Or just rely on the clear color for now + maybe some ambient floating particles.

        // Create ambient dust
        engine.createParticleSystem('dust', {
            maxParticles: 200,
            emissionRate: 5,
            particleLifetime: 10.0,
            startSize: 2.0,
            endSize: 2.0,
            startVelocity: { x: 5, y: 5, z: 0 },
            acceleration: { x: 0, y: 0, z: 0 },
            colorOverLifetime: [{ r: 0.2, g: 0.2, b: 0.3, a: 0.5 }],
            blending: 'additive',
            sorting: 'backToFront'
        });

        const animate = (time: number) => {
            const state = gameStateRef.current;
            let dt = 0.016;

            if (state) {
                // Sync Camera?
                // AAAEngine usually draws full screen.
                // Pass camera offset to shader? 
                // For now, allow particles to just float relative to screen (parallax).

                // Trigger Shockwaves based on state events?
                // e.g. state.vfxEvents
                while (state.vfxEvents && state.vfxEvents.length > 0) {
                    const evt = state.vfxEvents.shift();
                    // Parse event? "shockwave:x:y"
                    // Simplified: Just demo explosion at center if event
                }
            }

            engine.render(dt);
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            engine.dispose();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            className="absolute inset-0 z-0 bg-black"
        />
    );
};

export default BackgroundCanvas;
