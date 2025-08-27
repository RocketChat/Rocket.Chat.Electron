import { app } from 'electron';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

export interface SystemMemoryInfo {
  timestamp: number;
  system: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
    pressure: 'low' | 'medium' | 'high' | 'critical';
  };
  process: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  electron: {
    totalAppMemory: number;
    webviews: Array<{
      url: string;
      pid: number;
      memory: number;
      cpu: number;
    }>;
  };
}

/**
 * Memory Monitor feature that tracks system and application memory usage.
 * Provides real-time monitoring and historical data collection.
 */
export class MemoryMonitor extends MemoryFeature {
  private monitorInterval: NodeJS.Timeout | null = null;
  private history: SystemMemoryInfo[] = [];
  private maxHistorySize = 720; // 6 hours at 30-second intervals
  private intervalMs = 30000; // 30 seconds default
  private webContentsList = new Map<string, WebContents>();

  getName(): string {
    return 'MemoryMonitor';
  }

  protected async onEnable(): Promise<void> {
    // Adjust interval based on available RAM
    const totalGB = os.totalmem() / 1024 / 1024 / 1024;
    this.intervalMs = totalGB <= 8 ? 10000 : 30000; // 10s for low-mem, 30s otherwise

    // Start monitoring
    this.startMonitoring();
    
    // Capture initial snapshot
    await this.captureSnapshot();
    
    console.log(`[MemoryMonitor] Started with ${this.intervalMs}ms interval`);
  }

  protected async onDisable(): Promise<void> {
    this.stopMonitoring();
    
    // Export diagnostics on disable if there's significant data
    if (this.history.length > 10) {
      const filePath = await this.exportDiagnostics();
      console.log(`[MemoryMonitor] Exported diagnostics to ${filePath}`);
    }
    
    // Clear history
    this.history = [];
    this.webContentsList.clear();
  }

  protected async onApplyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    // Track this webcontents for monitoring
    this.webContentsList.set(serverUrl, webContents);
    console.log(`[MemoryMonitor] Tracking WebContents for ${serverUrl}`);
    
    // Inject memory monitoring script into the webview
    try {
      await webContents.executeJavaScript(`
        // Report memory usage from within the webview
        if (window.performance && window.performance.memory) {
          console.log('[MemoryMonitor] WebView Memory:', {
            usedJSHeapSize: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
            totalJSHeapSize: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
            jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB'
          });
        }
      `);
    } catch (error) {
      // WebContents might not be ready yet, that's okay
    }
  }

  protected async onSystemResume(): Promise<void> {
    // After system resume, capture a snapshot immediately
    console.log('[MemoryMonitor] System resumed, capturing memory snapshot');
    await this.captureSnapshot();
    
    // Check if we have memory pressure
    const latestSnapshot = this.history[this.history.length - 1];
    if (latestSnapshot && latestSnapshot.system.pressure !== 'low') {
      console.warn('[MemoryMonitor] Memory pressure detected after resume:', latestSnapshot.system.pressure);
    }
  }

  private startMonitoring(): void {
    if (this.monitorInterval) {
      return;
    }

    this.monitorInterval = setInterval(async () => {
      await this.captureSnapshot();
    }, this.intervalMs);
  }

  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async captureSnapshot(): Promise<SystemMemoryInfo> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentUsed = (usedMemory / totalMemory) * 100;

    // Get Electron app metrics
    const appMetrics = app.getAppMetrics();
    const totalAppMemory = appMetrics.reduce(
      (sum, metric) => sum + metric.memory.workingSetSize,
      0
    );

    // Get webview details
    const webviews: SystemMemoryInfo['electron']['webviews'] = [];
    for (const [url, wc] of this.webContentsList) {
      if (!wc.isDestroyed()) {
        const metric = appMetrics.find(m => m.webContents?.id === wc.id);
        if (metric) {
          webviews.push({
            url,
            pid: metric.pid,
            memory: metric.memory.workingSetSize,
            cpu: metric.cpu ? metric.cpu.percentCPUUsage : 0
          });
        }
      }
    }

    // Sort webviews by memory usage
    webviews.sort((a, b) => b.memory - a.memory);

    // Determine memory pressure
    const pressure = this.calculatePressure(percentUsed, freeMemory);

    const snapshot: SystemMemoryInfo = {
      timestamp: Date.now(),
      system: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentUsed,
        pressure
      },
      process: process.memoryUsage(),
      electron: {
        totalAppMemory: totalAppMemory * 1024, // Convert to bytes
        webviews
      }
    };

    // Add to history
    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Log if concerning
    if (pressure === 'high' || pressure === 'critical') {
      console.warn('[MemoryMonitor] Memory pressure detected:', {
        pressure,
        systemUsed: `${percentUsed.toFixed(1)}%`,
        appMemory: `${(totalAppMemory / 1024).toFixed(1)}MB`,
        topWebview: webviews[0]
      });
    }

    // Update metrics
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();

    return snapshot;
  }

  private calculatePressure(
    percentUsed: number,
    freeBytes: number
  ): SystemMemoryInfo['system']['pressure'] {
    const freeMB = freeBytes / 1024 / 1024;

    // Adjust thresholds based on total system memory
    const totalGB = os.totalmem() / 1024 / 1024 / 1024;
    
    if (totalGB <= 4) {
      // Strict thresholds for low-memory systems
      if (percentUsed > 85 || freeMB < 300) return 'critical';
      if (percentUsed > 75 || freeMB < 500) return 'high';
      if (percentUsed > 65 || freeMB < 1000) return 'medium';
    } else if (totalGB <= 8) {
      // Moderate thresholds
      if (percentUsed > 90 || freeMB < 400) return 'critical';
      if (percentUsed > 80 || freeMB < 800) return 'high';
      if (percentUsed > 70 || freeMB < 1500) return 'medium';
    } else {
      // Relaxed thresholds for high-memory systems
      if (percentUsed > 95 || freeMB < 500) return 'critical';
      if (percentUsed > 85 || freeMB < 1000) return 'high';
      if (percentUsed > 75 || freeMB < 2000) return 'medium';
    }

    return 'low';
  }

  async exportDiagnostics(): Promise<string> {
    const diagnosticsDir = path.join(
      app.getPath('userData'),
      'memory-diagnostics'
    );
    
    await fs.mkdir(diagnosticsDir, { recursive: true });
    
    const filename = `memory-${Date.now()}.json`;
    const filepath = path.join(diagnosticsDir, filename);
    
    const report = {
      system: {
        platform: process.platform,
        arch: process.arch,
        totalMemory: os.totalmem(),
        cpus: os.cpus().length,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      },
      monitoringConfig: {
        intervalMs: this.intervalMs,
        maxHistorySize: this.maxHistorySize
      },
      history: this.history.slice(-100), // Last 100 snapshots
      summary: this.generateSummary()
    };
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    return filepath;
  }

  private generateSummary() {
    if (this.history.length === 0) return null;
    
    const recent = this.history.slice(-20); // Last 10 minutes (assuming 30s intervals)
    
    const appMemoryValues = recent.map(s => s.electron.totalAppMemory);
    const systemUsedValues = recent.map(s => s.system.percentUsed);
    
    return {
      samples: recent.length,
      period: {
        start: new Date(recent[0].timestamp).toISOString(),
        end: new Date(recent[recent.length - 1].timestamp).toISOString()
      },
      appMemory: {
        average: appMemoryValues.reduce((a, b) => a + b, 0) / appMemoryValues.length,
        peak: Math.max(...appMemoryValues),
        current: appMemoryValues[appMemoryValues.length - 1]
      },
      systemMemory: {
        averagePercent: systemUsedValues.reduce((a, b) => a + b, 0) / systemUsedValues.length,
        peakPercent: Math.max(...systemUsedValues),
        currentPercent: systemUsedValues[systemUsedValues.length - 1]
      },
      pressureDistribution: {
        low: recent.filter(s => s.system.pressure === 'low').length,
        medium: recent.filter(s => s.system.pressure === 'medium').length,
        high: recent.filter(s => s.system.pressure === 'high').length,
        critical: recent.filter(s => s.system.pressure === 'critical').length
      },
      topMemoryConsumers: this.getTopMemoryConsumers(recent)
    };
  }

  private getTopMemoryConsumers(snapshots: SystemMemoryInfo[]) {
    const urlMemoryMap = new Map<string, number[]>();
    
    // Collect memory usage for each URL
    for (const snapshot of snapshots) {
      for (const webview of snapshot.electron.webviews) {
        if (!urlMemoryMap.has(webview.url)) {
          urlMemoryMap.set(webview.url, []);
        }
        urlMemoryMap.get(webview.url)!.push(webview.memory);
      }
    }
    
    // Calculate averages and sort
    const consumers = Array.from(urlMemoryMap.entries())
      .map(([url, memories]) => ({
        url,
        averageMemory: memories.reduce((a, b) => a + b, 0) / memories.length,
        peakMemory: Math.max(...memories)
      }))
      .sort((a, b) => b.averageMemory - a.averageMemory)
      .slice(0, 5); // Top 5
    
    return consumers;
  }

  /**
   * Get current memory state for display in UI
   */
  getCurrentState(): SystemMemoryInfo | null {
    return this.history.length > 0 
      ? this.history[this.history.length - 1]
      : null;
  }

  /**
   * Get memory history for graphing
   */
  getHistory(limit = 100): SystemMemoryInfo[] {
    return this.history.slice(-limit);
  }

  /**
   * Force an immediate snapshot
   */
  async forceSnapshot(): Promise<SystemMemoryInfo> {
    return await this.captureSnapshot();
  }
}