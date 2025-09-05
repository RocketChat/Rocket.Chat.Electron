import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { app, webContents, BrowserWindow, powerMonitor } from 'electron';
import type { WebContents } from 'electron';

import { MemoryFeature } from '../MemoryFeature';

export interface PerformanceMetric {
  timestamp: number;
  category: 'memory' | 'cpu' | 'network' | 'disk' | 'render' | 'event-loop';
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface PerformanceSnapshot {
  timestamp: number;
  duration: number;

  // System metrics
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };

  // Memory metrics
  memory: {
    app: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    system: {
      total: number;
      free: number;
      available: number;
      pressure: 'none' | 'low' | 'medium' | 'high' | 'critical';
    };
    processes: Array<{
      pid: number;
      type: string;
      memory: number;
      cpu: number;
    }>;
  };

  // Render performance
  render: {
    fps: number;
    frameTime: number;
    jank: number;
    longTasks: number;
    paintTime: number;
  };

  // Network metrics
  network: {
    requests: number;
    bytesReceived: number;
    bytesSent: number;
    latency: number;
    errors: number;
  };

  // Event loop metrics
  eventLoop: {
    lag: number;
    pendingCallbacks: number;
    activeHandles: number;
    activeRequests: number;
  };

  // WebContents specific metrics
  webContents: Array<{
    id: number;
    url: string;
    memory: number;
    cpu: number;
    navigationTime: number;
    domNodes: number;
    jsHeapSize: number;
    listeners: number;
  }>;
}

export interface PerformanceReport {
  startTime: number;
  endTime: number;
  duration: number;
  samples: number;

  summary: {
    avgCPU: number;
    peakCPU: number;
    avgMemory: number;
    peakMemory: number;
    avgFPS: number;
    minFPS: number;
    totalNetworkBytes: number;
    memoryLeakSuspected: boolean;
    performanceScore: number; // 0-100
  };

  recommendations: string[];
  snapshots: PerformanceSnapshot[];
  anomalies: Array<{
    timestamp: number;
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    metric: PerformanceMetric;
  }>;
}

/**
 * Performance Collector that gathers comprehensive performance metrics
 * across CPU, memory, network, rendering, and event loop.
 */
export class PerformanceCollector extends MemoryFeature {
  private collectionInterval: NodeJS.Timeout | null = null;

  private metrics: PerformanceMetric[] = [];

  private snapshots: PerformanceSnapshot[] = [];

  private anomalies: PerformanceReport['anomalies'] = [];

  // Configuration
  private readonly COLLECTION_INTERVAL = 5000; // 5 seconds

  private readonly MAX_METRICS = 10000;

  private readonly MAX_SNAPSHOTS = 720; // 1 hour at 5-second intervals

  // Performance thresholds
  private readonly CPU_HIGH_THRESHOLD = 80;

  private readonly MEMORY_HIGH_THRESHOLD = 85;

  private readonly FPS_LOW_THRESHOLD = 30;

  private readonly EVENT_LOOP_LAG_THRESHOLD = 100; // ms

  // Tracking
  private startTime: number = 0;

  private lastCPUUsage: NodeJS.CpuUsage | null = null;

  private networkStats = {
    requests: 0,
    bytesReceived: 0,
    bytesSent: 0,
    errors: 0,
  };

  getName(): string {
    return 'PerformanceCollector';
  }

  protected async onEnable(): Promise<void> {
    this.startTime = Date.now();
    this.startCollection();
    this.attachListeners();
    console.log(
      '[PerformanceCollector] Started collecting performance metrics'
    );
  }

  protected async onDisable(): Promise<void> {
    this.stopCollection();
    this.detachListeners();
    await this.saveReport();
  }

  private startCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectSnapshot();
    }, this.COLLECTION_INTERVAL);

    // Collect initial snapshot
    this.collectSnapshot();
  }

  private stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  private attachListeners(): void {
    // Monitor network activity
    const allWebContents = webContents.getAllWebContents();
    allWebContents.forEach((wc) => this.attachWebContentsListeners(wc));

    // Monitor power events
    powerMonitor.on('suspend', this.handleSystemSuspend);
    powerMonitor.on('resume', this.handleSystemResume);
  }

  private detachListeners(): void {
    powerMonitor.removeListener('suspend', this.handleSystemSuspend);
    powerMonitor.removeListener('resume', this.handleSystemResume);
  }

  private attachWebContentsListeners(wc: WebContents): void {
    wc.on('did-start-navigation', () => {
      this.networkStats.requests++;
    });

    wc.on('did-fail-load', () => {
      this.networkStats.errors++;
    });
  }

  private async collectSnapshot(): Promise<void> {
    const snapshot = await this.buildSnapshot();
    this.snapshots.push(snapshot);

    // Convert snapshot to metrics
    this.extractMetrics(snapshot);

    // Check for anomalies
    this.detectAnomalies(snapshot);

    // Limit history
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private async buildSnapshot(): Promise<PerformanceSnapshot> {
    const timestamp = Date.now();
    const duration = timestamp - this.startTime;

    // Collect CPU metrics
    const cpuUsage = process.cpuUsage(this.lastCPUUsage || undefined);
    this.lastCPUUsage = cpuUsage;

    const cpuPercent =
      (((cpuUsage.user + cpuUsage.system) / 1000000) * 100) /
      (this.COLLECTION_INTERVAL / 1000);

    // Collect memory metrics
    const memUsage = process.memoryUsage();
    const appMetrics = app.getAppMetrics();

    // Calculate system memory pressure
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

    let pressure: PerformanceSnapshot['memory']['system']['pressure'];
    if (usedPercent < 60) pressure = 'none';
    else if (usedPercent < 75) pressure = 'low';
    else if (usedPercent < 85) pressure = 'medium';
    else if (usedPercent < 95) pressure = 'high';
    else pressure = 'critical';

    // Collect render performance (estimated)
    const windows = BrowserWindow.getAllWindows();
    const renderMetrics = await this.collectRenderMetrics(windows);

    // Collect WebContents metrics
    const wcMetrics = await this.collectWebContentsMetrics();

    // Event loop metrics
    const eventLoopLag = await this.measureEventLoopLag();

    return {
      timestamp,
      duration,

      cpu: {
        usage: cpuPercent,
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },

      memory: {
        app: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
        },
        system: {
          total: totalMem,
          free: freeMem,
          available: freeMem,
          pressure,
        },
        processes: appMetrics.map((m) => ({
          pid: m.pid,
          type: m.type,
          memory: m.memory.workingSetSize * 1024,
          cpu: m.cpu ? m.cpu.percentCPUUsage : 0,
        })),
      },

      render: renderMetrics,

      network: {
        ...this.networkStats,
        latency: 0, // Would need actual measurement
      },

      eventLoop: {
        lag: eventLoopLag,
        pendingCallbacks: (process as any)._getActiveRequests?.()?.length || 0,
        activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
        activeRequests: 0,
      },

      webContents: wcMetrics,
    };
  }

  private async collectRenderMetrics(
    windows: BrowserWindow[]
  ): Promise<PerformanceSnapshot['render']> {
    // Simplified render metrics - in real implementation would use actual measurements
    return {
      fps: 60, // Default, would need actual measurement
      frameTime: 16.67, // Default for 60fps
      jank: 0,
      longTasks: 0,
      paintTime: 0,
    };
  }

  private async collectWebContentsMetrics(): Promise<
    PerformanceSnapshot['webContents']
  > {
    const allWebContents = webContents.getAllWebContents();
    const metrics: PerformanceSnapshot['webContents'] = [];

    for (const wc of allWebContents) {
      if (wc.isDestroyed()) continue;

      try {
        // Attempt to gather DOM metrics
        const domMetrics = await wc
          .executeJavaScript(
            `
          ({
            nodeCount: document.querySelectorAll('*').length,
            listenerCount: Array.from(document.querySelectorAll('*')).reduce((count, el) => {
              return count + (getEventListeners ? Object.keys(getEventListeners(el)).length : 0);
            }, 0),
            jsHeapSize: performance.memory ? performance.memory.usedJSHeapSize : 0
          })
        `
          )
          .catch(() => ({ nodeCount: 0, listenerCount: 0, jsHeapSize: 0 }));

        metrics.push({
          id: wc.id,
          url: wc.getURL(),
          memory: 0, // Would need process-specific memory
          cpu: 0, // Would need process-specific CPU
          navigationTime: 0, // Would need navigation timing API
          domNodes: domMetrics.nodeCount,
          jsHeapSize: domMetrics.jsHeapSize,
          listeners: domMetrics.listenerCount,
        });
      } catch (error) {
        // Skip if can't collect metrics
      }
    }

    return metrics;
  }

  private async measureEventLoopLag(): Promise<number> {
    const start = process.hrtime.bigint();
    await new Promise((resolve) => setImmediate(resolve));
    const end = process.hrtime.bigint();
    return Number((end - start) / 1000000n); // Convert to milliseconds
  }

  private extractMetrics(snapshot: PerformanceSnapshot): void {
    // CPU metrics
    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'cpu',
      name: 'usage',
      value: snapshot.cpu.usage,
      unit: 'percent',
    });

    // Memory metrics
    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'memory',
      name: 'heap_used',
      value: snapshot.memory.app.heapUsed,
      unit: 'bytes',
    });

    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'memory',
      name: 'rss',
      value: snapshot.memory.app.rss,
      unit: 'bytes',
    });

    // Render metrics
    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'render',
      name: 'fps',
      value: snapshot.render.fps,
      unit: 'frames',
    });

    // Event loop metrics
    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'event-loop',
      name: 'lag',
      value: snapshot.eventLoop.lag,
      unit: 'ms',
    });

    // Network metrics
    this.addMetric({
      timestamp: snapshot.timestamp,
      category: 'network',
      name: 'requests',
      value: snapshot.network.requests,
      unit: 'count',
    });
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  private detectAnomalies(snapshot: PerformanceSnapshot): void {
    // High CPU usage
    if (snapshot.cpu.usage > this.CPU_HIGH_THRESHOLD) {
      this.addAnomaly({
        timestamp: snapshot.timestamp,
        type: 'high_cpu',
        severity: snapshot.cpu.usage > 95 ? 'high' : 'medium',
        description: `CPU usage at ${snapshot.cpu.usage.toFixed(1)}%`,
        metric: {
          timestamp: snapshot.timestamp,
          category: 'cpu',
          name: 'usage',
          value: snapshot.cpu.usage,
          unit: 'percent',
        },
      });
    }

    // High memory usage
    const memoryPercent =
      ((snapshot.memory.system.total - snapshot.memory.system.free) /
        snapshot.memory.system.total) *
      100;
    if (memoryPercent > this.MEMORY_HIGH_THRESHOLD) {
      this.addAnomaly({
        timestamp: snapshot.timestamp,
        type: 'high_memory',
        severity: memoryPercent > 95 ? 'high' : 'medium',
        description: `Memory usage at ${memoryPercent.toFixed(1)}%`,
        metric: {
          timestamp: snapshot.timestamp,
          category: 'memory',
          name: 'system_usage',
          value: memoryPercent,
          unit: 'percent',
        },
      });
    }

    // Low FPS
    if (snapshot.render.fps < this.FPS_LOW_THRESHOLD) {
      this.addAnomaly({
        timestamp: snapshot.timestamp,
        type: 'low_fps',
        severity: snapshot.render.fps < 15 ? 'high' : 'medium',
        description: `FPS dropped to ${snapshot.render.fps}`,
        metric: {
          timestamp: snapshot.timestamp,
          category: 'render',
          name: 'fps',
          value: snapshot.render.fps,
          unit: 'frames',
        },
      });
    }

    // Event loop lag
    if (snapshot.eventLoop.lag > this.EVENT_LOOP_LAG_THRESHOLD) {
      this.addAnomaly({
        timestamp: snapshot.timestamp,
        type: 'event_loop_lag',
        severity: snapshot.eventLoop.lag > 500 ? 'high' : 'medium',
        description: `Event loop lag at ${snapshot.eventLoop.lag}ms`,
        metric: {
          timestamp: snapshot.timestamp,
          category: 'event-loop',
          name: 'lag',
          value: snapshot.eventLoop.lag,
          unit: 'ms',
        },
      });
    }
  }

  private addAnomaly(anomaly: PerformanceReport['anomalies'][0]): void {
    this.anomalies.push(anomaly);
    console.log(
      `[PerformanceCollector] Anomaly detected: ${anomaly.description}`
    );

    // Limit anomaly history
    if (this.anomalies.length > 1000) {
      this.anomalies.shift();
    }
  }

  private handleSystemSuspend = (): void => {
    console.log('[PerformanceCollector] System suspended, pausing collection');
    this.stopCollection();
  };

  private handleSystemResume = (): void => {
    console.log('[PerformanceCollector] System resumed, resuming collection');
    this.startCollection();
  };

  // Public API

  public getMetrics(
    category?: PerformanceMetric['category']
  ): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter((m) => m.category === category);
    }
    return [...this.metrics];
  }

  public getLatestSnapshot(): PerformanceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  public getSnapshots(limit?: number): PerformanceSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  public generateReport(): PerformanceReport {
    if (this.snapshots.length === 0) {
      throw new Error('No performance data collected');
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Calculate summary statistics
    const cpuValues = this.snapshots.map((s) => s.cpu.usage);
    const memoryValues = this.snapshots.map((s) => s.memory.app.heapUsed);
    const fpsValues = this.snapshots.map((s) => s.render.fps);
    const networkBytes = this.snapshots.reduce(
      (sum, s) => sum + s.network.bytesReceived + s.network.bytesSent,
      0
    );

    const avgCPU = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const peakCPU = Math.max(...cpuValues);
    const avgMemory =
      memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const peakMemory = Math.max(...memoryValues);
    const avgFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const minFPS = Math.min(...fpsValues);

    // Detect memory leak (simple heuristic)
    const memoryLeakSuspected = this.detectMemoryLeak(memoryValues);

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      avgCPU,
      avgMemory,
      avgFPS,
      anomalyCount: this.anomalies.length,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      avgCPU,
      peakCPU,
      avgMemory,
      peakMemory,
      avgFPS,
      minFPS,
      memoryLeakSuspected,
      anomalies: this.anomalies,
    });

    return {
      startTime: this.startTime,
      endTime,
      duration,
      samples: this.snapshots.length,

      summary: {
        avgCPU,
        peakCPU,
        avgMemory,
        peakMemory,
        avgFPS,
        minFPS,
        totalNetworkBytes: networkBytes,
        memoryLeakSuspected,
        performanceScore,
      },

      recommendations,
      snapshots: this.snapshots,
      anomalies: this.anomalies,
    };
  }

  private detectMemoryLeak(memoryValues: number[]): boolean {
    if (memoryValues.length < 10) return false;

    // Simple linear regression to detect steady growth
    const n = memoryValues.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = memoryValues.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * memoryValues[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgMemory = sumY / n;

    // If slope is positive and significant relative to average memory
    return slope > 0 && slope > avgMemory * 0.01;
  }

  private calculatePerformanceScore(params: {
    avgCPU: number;
    avgMemory: number;
    avgFPS: number;
    anomalyCount: number;
  }): number {
    let score = 100;

    // CPU impact (0-30 points)
    if (params.avgCPU > 80) score -= 30;
    else if (params.avgCPU > 60) score -= 20;
    else if (params.avgCPU > 40) score -= 10;

    // Memory impact (0-30 points)
    const memoryMB = params.avgMemory / (1024 * 1024);
    if (memoryMB > 2000) score -= 30;
    else if (memoryMB > 1000) score -= 20;
    else if (memoryMB > 500) score -= 10;

    // FPS impact (0-20 points)
    if (params.avgFPS < 30) score -= 20;
    else if (params.avgFPS < 45) score -= 10;
    else if (params.avgFPS < 55) score -= 5;

    // Anomaly impact (0-20 points)
    score -= Math.min(20, params.anomalyCount * 2);

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(params: any): string[] {
    const recommendations: string[] = [];

    if (params.avgCPU > 70) {
      recommendations.push(
        'High CPU usage detected. Consider optimizing JavaScript execution.'
      );
    }

    if (params.peakCPU > 95) {
      recommendations.push(
        'CPU spikes detected. Check for blocking operations or infinite loops.'
      );
    }

    if (params.avgMemory > 1000 * 1024 * 1024) {
      recommendations.push(
        'High memory usage. Consider implementing memory cleanup strategies.'
      );
    }

    if (params.memoryLeakSuspected) {
      recommendations.push(
        'Potential memory leak detected. Review object lifecycle and event listeners.'
      );
    }

    if (params.avgFPS < 45) {
      recommendations.push(
        'Low frame rate detected. Optimize rendering and reduce DOM manipulations.'
      );
    }

    if (params.minFPS < 20) {
      recommendations.push(
        'Severe frame drops detected. Profile rendering performance.'
      );
    }

    return recommendations;
  }

  private async saveReport(): Promise<void> {
    try {
      const report = this.generateReport();
      const reportPath = path.join(
        app.getPath('userData'),
        'performance-reports'
      );
      await fs.mkdir(reportPath, { recursive: true });

      const filename = `performance-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(
        path.join(reportPath, filename),
        JSON.stringify(report, null, 2)
      );

      console.log(`[PerformanceCollector] Report saved to ${filename}`);
    } catch (error) {
      console.error('[PerformanceCollector] Failed to save report:', error);
    }
  }

  public exportCSV(): string {
    const headers = [
      'timestamp',
      'cpu_usage',
      'memory_heap',
      'memory_rss',
      'fps',
      'event_loop_lag',
    ];
    const rows = this.snapshots.map((s) => [
      s.timestamp,
      s.cpu.usage.toFixed(2),
      s.memory.app.heapUsed,
      s.memory.app.rss,
      s.render.fps,
      s.eventLoop.lag,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}
