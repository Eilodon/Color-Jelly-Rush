import { clientLogger } from "../logging/ClientLogger";
/**
 * PRODUCTION PERFORMANCE MONITOR
 * Real-time FPS tracking, memory profiling, and optimization
 * EIDOLON-V Phase 0: Enhanced with GC pause detection and frame outlier logging
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  particleCount: number;
  entityCount: number;
  networkLatency: number;
}

export interface PerformanceThresholds {
  targetFPS: number;
  minFPS: number;
  maxMemoryMB: number;
  maxDrawCalls: number;
}

export interface GCStats {
  outlierCount: number;
  avgOutlierMs: number;
  estimatedGCPauses: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    particleCount: 0,
    entityCount: 0,
    networkLatency: 0,
  };

  private thresholds: PerformanceThresholds = {
    targetFPS: 60,
    minFPS: 30,
    maxMemoryMB: 200,
    maxDrawCalls: 1000,
  };

  private frameCount = 0;
  private windowFrameCount = 0;
  private windowStartTime = performance.now();
  private lastTime = performance.now();
  private fpsHistory: number[] = [];
  private memoryHistory: number[] = [];
  private isMonitoring = false;
  private qualityLevel: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  private onQualityChange?: (level: string) => void;

  // EIDOLON-V Phase 0: GC/Frame Outlier Detection
  private debugMode = false;
  private frameTimeOutliers: number[] = [];
  private estimatedGCPauses = 0;
  private lastMemorySnapshot = 0;
  private readonly FRAME_OUTLIER_THRESHOLD_MS = 20; // 1.2x 60fps budget
  private readonly GC_MEMORY_SPIKE_MB = 5; // Sudden 5MB+ drop suggests GC

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
    // Auto-enable debug mode from env or URL
    this.debugMode = this.detectDebugMode();
  }

  private detectDebugMode(): boolean {
    // Check env var (Vite injects import.meta.env)
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEBUG_GC === '1') {
        return true;
      }
    } catch { /* ignore */ }
    // Check URL query param
    if (typeof window !== 'undefined' && window.location?.search?.includes('debug_gc=1')) {
      return true;
    }
    return false;
  }

  enableDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (enabled) {
      clientLogger.debug('[PerformanceMonitor] Debug mode ENABLED - tracking GC pauses and frame outliers');
    }
  }

  isDebugEnabled(): boolean {
    return this.debugMode;
  }

  startMonitoring() {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.frameTimeOutliers = [];
    this.estimatedGCPauses = 0;
    this.lastMemorySnapshot = 0;
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  updateFrame() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.frameCount++;
    this.windowFrameCount++;
    this.metrics.frameTime = deltaTime;

    // EIDOLON-V Phase 0: Track frame time outliers
    if (this.debugMode && deltaTime > this.FRAME_OUTLIER_THRESHOLD_MS) {
      this.frameTimeOutliers.push(deltaTime);
      if (this.frameTimeOutliers.length > 100) {
        this.frameTimeOutliers.shift(); // Keep last 100 outliers
      }
      console.warn(`[GC Debug] Frame outlier: ${deltaTime.toFixed(2)}ms (threshold: ${this.FRAME_OUTLIER_THRESHOLD_MS}ms)`);
    }

    // Calculate FPS over a small window (more stable than 1000 / last frame time)
    if (this.windowFrameCount >= 10) {
      const windowMs = now - this.windowStartTime;
      this.metrics.fps = windowMs > 0 ? Math.round((this.windowFrameCount * 1000) / windowMs) : this.metrics.fps;
      this.windowFrameCount = 0;
      this.windowStartTime = now;
      this.fpsHistory.push(this.metrics.fps);

      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      this.checkPerformanceThresholds();
      this.updateMemoryUsage();
    }
  }

  private updateMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const currentMemoryMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);

      // EIDOLON-V Phase 0: Detect GC pauses via memory drops
      if (this.debugMode && this.lastMemorySnapshot > 0) {
        const memoryDrop = this.lastMemorySnapshot - currentMemoryMB;
        if (memoryDrop >= this.GC_MEMORY_SPIKE_MB) {
          this.estimatedGCPauses++;
          clientLogger.warn(`[GC Debug] Estimated GC pause #${this.estimatedGCPauses}: memory dropped ${memoryDrop}MB (${this.lastMemorySnapshot}MB -> ${currentMemoryMB}MB)`);
        }
      }
      this.lastMemorySnapshot = currentMemoryMB;

      this.metrics.memoryUsage = currentMemoryMB;
      this.memoryHistory.push(this.metrics.memoryUsage);

      if (this.memoryHistory.length > 60) {
        this.memoryHistory.shift();
      }
    }
  }

  // EIDOLON-V Phase 0: GC Statistics API
  getGCStats(): GCStats {
    const outlierCount = this.frameTimeOutliers.length;
    const avgOutlierMs = outlierCount > 0
      ? this.frameTimeOutliers.reduce((a, b) => a + b, 0) / outlierCount
      : 0;
    return {
      outlierCount,
      avgOutlierMs: Math.round(avgOutlierMs * 100) / 100,
      estimatedGCPauses: this.estimatedGCPauses,
    };
  }

  private checkPerformanceThresholds() {
    const avgFPS = this.getAverageFPS();
    const memoryUsage = this.metrics.memoryUsage;

    // Auto-adjust quality based on performance
    if (avgFPS < this.thresholds.minFPS) {
      this.downgradeQuality();
    } else if (avgFPS >= this.thresholds.targetFPS && memoryUsage < this.thresholds.maxMemoryMB * 0.7) {
      this.upgradeQuality();
    }
  }

  private downgradeQuality() {
    const qualities: Array<'low' | 'medium' | 'high' | 'ultra'> = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = qualities.indexOf(this.qualityLevel);

    if (currentIndex > 0) {
      this.qualityLevel = qualities[currentIndex - 1];
      this.onQualityChange?.(this.qualityLevel);
    }
  }

  private upgradeQuality() {
    const qualities: Array<'low' | 'medium' | 'high' | 'ultra'> = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = qualities.indexOf(this.qualityLevel);

    if (currentIndex < qualities.length - 1) {
      this.qualityLevel = qualities[currentIndex + 1];
      this.onQualityChange?.(this.qualityLevel);
    }
  }

  setDrawCalls(count: number) {
    this.metrics.drawCalls = count;
  }

  setParticleCount(count: number) {
    this.metrics.particleCount = count;
  }

  setEntityCount(count: number) {
    this.metrics.entityCount = count;
  }

  setNetworkLatency(latency: number) {
    this.metrics.networkLatency = latency;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
  }

  getAverageMemory(): number {
    if (this.memoryHistory.length === 0) return 0;
    return Math.round(this.memoryHistory.reduce((a, b) => a + b, 0) / this.memoryHistory.length);
  }

  getQualityLevel(): string {
    return this.qualityLevel;
  }

  setQualityChangeCallback(callback: (level: string) => void) {
    this.onQualityChange = callback;
  }

  // Performance profiling for debugging
  profileFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (this.debugMode && duration > 16.67) {
      console.warn(`[GC Debug] Slow function: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  // Generate performance report
  generateReport(): string {
    const avgFPS = this.getAverageFPS();
    const avgMemory = this.getAverageMemory();
    const fpsStability = this.calculateFPSStability();
    const gcStats = this.getGCStats();

    return `
📊 PERFORMANCE REPORT
==================
FPS: ${avgFPS} (Target: ${this.thresholds.targetFPS})
Memory: ${avgMemory}MB (Limit: ${this.thresholds.maxMemoryMB}MB)
Quality: ${this.qualityLevel}
Stability: ${fpsStability}%
Draw Calls: ${this.metrics.drawCalls}
Particles: ${this.metrics.particleCount}
Entities: ${this.metrics.entityCount}
Network: ${this.metrics.networkLatency}ms

GC Debug (${this.debugMode ? 'ON' : 'OFF'}):
  Frame Outliers: ${gcStats.outlierCount} (avg: ${gcStats.avgOutlierMs}ms)
  Est. GC Pauses: ${gcStats.estimatedGCPauses}

${avgFPS >= this.thresholds.targetFPS ? '✅' : '❌'} Frame Rate
${avgMemory <= this.thresholds.maxMemoryMB ? '✅' : '❌'} Memory Usage
${fpsStability >= 90 ? '✅' : '❌'} Performance Stability
    `.trim();
  }

  private calculateFPSStability(): number {
    if (this.fpsHistory.length < 10) return 100;

    const avg = this.getAverageFPS();
    const variance = this.fpsHistory.reduce((sum, fps) => sum + Math.pow(fps - avg, 2), 0) / this.fpsHistory.length;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, Math.min(100, 100 - (stdDev / avg) * 100));
  }
}

export const performanceMonitor = new PerformanceMonitor();
