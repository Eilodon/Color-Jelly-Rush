export class FixedGameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly timeStep: number;
  private rafId: number | null = null;
  private isRunning: boolean = false;

  constructor(
    private targetFps: number,
    private updateFn: (dt: number) => void,
    private renderFn: (alpha: number) => void
  ) {
    this.timeStep = 1 / targetFps;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    // Cap frame time to avoid spiral of death
    let frameTime = (time - this.lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25;

    this.lastTime = time;
    this.accumulator += frameTime;

    while (this.accumulator >= this.timeStep) {
      this.updateFn(this.timeStep);
      this.accumulator -= this.timeStep;
    }

    const alpha = this.accumulator / this.timeStep;
    this.renderFn(alpha);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
