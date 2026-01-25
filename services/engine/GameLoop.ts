export type UpdateCallback = (dt: number) => void;
export type RenderCallback = (alpha: number) => void;

/**
 * THE HEARTBEAT (Fixed Timestep Loop)
 * 
 * SOTA 2026 Standard for Gameplay Loops.
 * De-couples Simulation (Physics/Logic) from Rendering.
 * 
 * Core Invariant:
 * - Simulation ALWAYS runs at fixed dt (e.g. 1/60s).
 * - Rendering RUNS as fast as possible (vsync).
 * 
 * Prevents:
 * - "High FPS = Super Speed" bugs.
 * - "Low FPS = Tunneling" bugs.
 * - Non-deterministic physics.
 */
export class FixedGameLoop {
    private accumulator: number = 0;
    private lastTime: number = 0;
    private readonly timeStep: number;
    private frameId: number = 0;
    private isRunning: boolean = false;

    private onUpdate: UpdateCallback;
    private onRender: RenderCallback;

    // Panic threshold: if game falls too far behind (spiral of death), snap.
    private readonly maxAccumulator = 0.25; // 250ms

    constructor(targetTPS: number = 60, onUpdate: UpdateCallback, onRender: RenderCallback) {
        this.timeStep = 1 / targetTPS;
        this.onUpdate = onUpdate;
        this.onRender = onRender;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.frameId = requestAnimationFrame(this.loop);
    }

    public stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.frameId);
    }

    private loop = (currentTime: number) => {
        if (!this.isRunning) return;

        // 1. Calculate Delta Time (Real)
        // Cap dt to avoid "spiral of death" if tab was backgrounded
        let frameTime = (currentTime - this.lastTime) / 1000;
        if (frameTime > this.maxAccumulator) frameTime = this.maxAccumulator;

        this.lastTime = currentTime;
        this.accumulator += frameTime;

        // 2. Consume Accumulator (Fixed Steps)
        while (this.accumulator >= this.timeStep) {
            this.onUpdate(this.timeStep);
            this.accumulator -= this.timeStep;
        }

        // 3. Render (Interpolated)
        // Alpha is how far we are between the previous update and the next update (0.0 to 1.0)
        const alpha = this.accumulator / this.timeStep;
        this.onRender(alpha);

        this.frameId = requestAnimationFrame(this.loop);
    };
}
