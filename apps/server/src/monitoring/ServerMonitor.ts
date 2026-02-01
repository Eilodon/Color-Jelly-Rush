/**
 * SERVER PERFORMANCE MONITOR
 * Real-time server performance tracking and optimization
 */

export interface ServerMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    messagesPerSecond: number;
  };
  game: {
    activeRooms: number;
    totalPlayers: number;
    averageLatency: number;
    updateRate: number;
  };
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'network' | 'game';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

export class ServerMonitor {
  private metrics: ServerMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private lastCleanup = Date.now();
  private maxMetricsHistory = 1000;
  private maxAlertsHistory = 100;

  // Performance thresholds
  private readonly thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    latency: { warning: 150, critical: 300 }, // ms
    updateRate: { warning: 45, critical: 30 }, // FPS
    messagesPerSecond: { warning: 1000, critical: 2000 },
  };

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Collect metrics every second
    setInterval(() => {
      this.collectMetrics();
    }, 1000);

    // Cleanup old data every 5 minutes
    setInterval(
      () => {
        this.cleanupOldData();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Collect current server metrics
   */
  private collectMetrics(): ServerMetrics {
    const now = Date.now();

    const metrics: ServerMetrics = {
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      network: this.getNetworkMetrics(),
      game: this.getGameMetrics(),
      timestamp: now,
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Get CPU usage percentage
   */
  private getCPUUsage(): number {
    // In a real implementation, this would use system monitoring libraries
    // For demo purposes, we'll simulate CPU usage
    const baseUsage = 20;
    const loadVariation = Math.sin(Date.now() / 10000) * 15;
    const randomSpike = Math.random() * 10;

    return Math.max(0, Math.min(100, baseUsage + loadVariation + randomSpike));
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;

    return {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: (usedMemory / totalMemory) * 100,
    };
  }

  /**
   * Get network metrics
   */
  private getNetworkMetrics(): { bytesIn: number; bytesOut: number; messagesPerSecond: number } {
    // In a real implementation, this would track actual network usage
    // For demo purposes, we'll simulate network metrics
    const baseMessagesPerSecond = 50;
    const variation = Math.sin(Date.now() / 5000) * 20;

    return {
      bytesIn: Math.round(Math.random() * 10000 + 5000),
      bytesOut: Math.round(Math.random() * 8000 + 3000),
      messagesPerSecond: Math.max(0, baseMessagesPerSecond + variation),
    };
  }

  /**
   * Get game-specific metrics
   */
  private getGameMetrics(): {
    activeRooms: number;
    totalPlayers: number;
    averageLatency: number;
    updateRate: number;
  } {
    // In a real implementation, this would collect data from actual game rooms
    // For demo purposes, we'll simulate game metrics
    return {
      activeRooms: Math.floor(Math.random() * 10) + 1,
      totalPlayers: Math.floor(Math.random() * 100) + 10,
      averageLatency: Math.random() * 100 + 50,
      updateRate: 60 - Math.random() * 10, // Should be close to 60
    };
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  private checkThresholds(metrics: ServerMetrics): void {
    // CPU alerts
    if (metrics.cpu > this.thresholds.cpu.critical) {
      this.addAlert(
        'cpu',
        'critical',
        `CPU usage critically high: ${metrics.cpu.toFixed(1)}%`,
        metrics.cpu,
        this.thresholds.cpu.critical
      );
    } else if (metrics.cpu > this.thresholds.cpu.warning) {
      this.addAlert(
        'cpu',
        'medium',
        `CPU usage high: ${metrics.cpu.toFixed(1)}%`,
        metrics.cpu,
        this.thresholds.cpu.warning
      );
    }

    // Memory alerts
    if (metrics.memory.percentage > this.thresholds.memory.critical) {
      this.addAlert(
        'memory',
        'critical',
        `Memory usage critically high: ${metrics.memory.percentage.toFixed(1)}%`,
        metrics.memory.percentage,
        this.thresholds.memory.critical
      );
    } else if (metrics.memory.percentage > this.thresholds.memory.warning) {
      this.addAlert(
        'memory',
        'medium',
        `Memory usage high: ${metrics.memory.percentage.toFixed(1)}%`,
        metrics.memory.percentage,
        this.thresholds.memory.warning
      );
    }

    // Latency alerts
    if (metrics.game.averageLatency > this.thresholds.latency.critical) {
      this.addAlert(
        'game',
        'critical',
        `Average latency critically high: ${metrics.game.averageLatency.toFixed(0)}ms`,
        metrics.game.averageLatency,
        this.thresholds.latency.critical
      );
    } else if (metrics.game.averageLatency > this.thresholds.latency.warning) {
      this.addAlert(
        'game',
        'medium',
        `Average latency high: ${metrics.game.averageLatency.toFixed(0)}ms`,
        metrics.game.averageLatency,
        this.thresholds.latency.warning
      );
    }

    // Update rate alerts
    if (metrics.game.updateRate < this.thresholds.updateRate.critical) {
      this.addAlert(
        'game',
        'critical',
        `Update rate critically low: ${metrics.game.updateRate.toFixed(1)} FPS`,
        metrics.game.updateRate,
        this.thresholds.updateRate.critical
      );
    } else if (metrics.game.updateRate < this.thresholds.updateRate.warning) {
      this.addAlert(
        'game',
        'medium',
        `Update rate low: ${metrics.game.updateRate.toFixed(1)} FPS`,
        metrics.game.updateRate,
        this.thresholds.updateRate.warning
      );
    }

    // Network alerts
    if (metrics.network.messagesPerSecond > this.thresholds.messagesPerSecond.critical) {
      this.addAlert(
        'network',
        'critical',
        `Message rate critically high: ${metrics.network.messagesPerSecond.toFixed(0)}/s`,
        metrics.network.messagesPerSecond,
        this.thresholds.messagesPerSecond.critical
      );
    } else if (metrics.network.messagesPerSecond > this.thresholds.messagesPerSecond.warning) {
      this.addAlert(
        'network',
        'medium',
        `Message rate high: ${metrics.network.messagesPerSecond.toFixed(0)}/s`,
        metrics.network.messagesPerSecond,
        this.thresholds.messagesPerSecond.warning
      );
    }
  }

  /**
   * Add a performance alert
   */
  private addAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      timestamp: Date.now(),
      value,
      threshold,
    };

    this.alerts.push(alert);

    // Log critical alerts
    if (severity === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${message}`);
    } else if (severity === 'high') {
      console.warn(`⚠️ HIGH ALERT: ${message}`);
    }

    // Limit alerts history
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ServerMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(minutes: number = 5): ServerMetrics[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(minutes: number = 10): PerformanceAlert[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.alerts.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    cpu: { current: number; average: number; max: number };
    memory: { current: number; average: number; max: number };
    latency: { current: number; average: number; max: number };
    alerts: { total: number; critical: number; warnings: number };
  } {
    const recentMetrics = this.getMetricsHistory(5);
    const recentAlerts = this.getRecentAlerts(10);

    if (recentMetrics.length === 0) {
      return {
        status: 'healthy',
        cpu: { current: 0, average: 0, max: 0 },
        memory: { current: 0, average: 0, max: 0 },
        latency: { current: 0, average: 0, max: 0 },
        alerts: { total: 0, critical: 0, warnings: 0 },
      };
    }

    const cpuValues = recentMetrics.map(m => m.cpu);
    const memoryValues = recentMetrics.map(m => m.memory.percentage);
    const latencyValues = recentMetrics.map(m => m.game.averageLatency);

    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = recentAlerts.filter(
      a => a.severity === 'medium' || a.severity === 'high'
    ).length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (
      warningAlerts > 0 ||
      cpuValues[cpuValues.length - 1] > 70 ||
      memoryValues[memoryValues.length - 1] > 80
    ) {
      status = 'warning';
    }

    return {
      status,
      cpu: {
        current: cpuValues[cpuValues.length - 1],
        average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        max: Math.max(...cpuValues),
      },
      memory: {
        current: memoryValues[memoryValues.length - 1],
        average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        max: Math.max(...memoryValues),
      },
      latency: {
        current: latencyValues[latencyValues.length - 1],
        average: latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length,
        max: Math.max(...latencyValues),
      },
      alerts: {
        total: recentAlerts.length,
        critical: criticalAlerts,
        warnings: warningAlerts,
      },
    };
  }

  /**
   * Cleanup old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean up old metrics
    this.metrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);

    // Clean up old alerts
    this.alerts = this.alerts.filter(a => a.timestamp >= oneHourAgo);

    this.lastCleanup = now;
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): string {
    const summary = this.getPerformanceSummary();
    return JSON.stringify(
      {
        timestamp: Date.now(),
        summary,
        current: this.getCurrentMetrics(),
        recentAlerts: this.getRecentAlerts(60),
      },
      null,
      2
    );
  }

  /**
   * Get system health check
   */
  getHealthCheck(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const summary = this.getPerformanceSummary();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (summary.status === 'critical') {
      issues.push('Server is in critical state');
      recommendations.push('Immediate intervention required');
    }

    if (summary.cpu.current > 80) {
      issues.push('High CPU usage');
      recommendations.push('Consider scaling up or optimizing game logic');
    }

    if (summary.memory.current > 85) {
      issues.push('High memory usage');
      recommendations.push('Check for memory leaks and optimize data structures');
    }

    if (summary.latency.current > 200) {
      issues.push('High latency');
      recommendations.push('Optimize network code and consider edge servers');
    }

    if (summary.alerts.critical > 0) {
      issues.push(`${summary.alerts.critical} critical alerts in last 10 minutes`);
      recommendations.push('Review alert logs and address root causes');
    }

    return {
      healthy: summary.status === 'healthy',
      issues,
      recommendations,
    };
  }

  /**
   * Dispose of monitor
   */
  dispose(): void {
    this.metrics = [];
    this.alerts = [];
  }
}

export const serverMonitor = new ServerMonitor();
