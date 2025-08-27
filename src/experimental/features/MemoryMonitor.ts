import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

export interface SystemMemoryInfo {
  timestamp: number;
  app: {
    totalMemory: number;
    mainProcess: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    rendererProcesses: number;
    pressure: 'low' | 'medium' | 'high';
  };
  webviews: Array<{
    url: string;
    pid: number;
    memory: number;
    cpu: number;
  }>;
}

/**
 * Memory Monitor feature that tracks system and application memory usage.
 * Provides real-time monitoring and historical data collection.
 */
export class MemoryMonitor extends MemoryFeature {
  private monitorInterval: NodeJS.Timeout | null = null;
  private history: SystemMemoryInfo[] = [];
  private maxHistorySize = 180; // 6 hours at 2-minute intervals
  private intervalMs = 120000; // 2 minutes default
  private webContentsList = new Map<string, WebContents>();

  getName(): string {
    return 'MemoryMonitor';
  }

  protected async onEnable(): Promise<void> {
    // Use 2-minute interval for regular monitoring
    this.intervalMs = 120000; // 2 minutes

    // Start monitoring
    this.startMonitoring();
    
    // Capture initial snapshot
    await this.captureSnapshot();
    
    console.log(`[MemoryMonitor] Started with ${this.intervalMs / 1000} second interval`);
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
    // Get Electron app metrics
    const appMetrics = app.getAppMetrics();
    const totalAppMemory = appMetrics.reduce(
      (sum, metric) => sum + metric.memory.workingSetSize,
      0
    ) * 1024; // Convert to bytes

    // Count renderer processes
    const rendererProcesses = appMetrics.filter(m => m.type === 'Renderer').length;

    // Get main process memory
    const mainProcessMemory = process.memoryUsage();

    // Get webview details
    const webviews: SystemMemoryInfo['webviews'] = [];
    for (const [url, wc] of this.webContentsList) {
      if (!wc.isDestroyed()) {
        const metric = appMetrics.find(m => m.webContents?.id === wc.id);
        if (metric) {
          webviews.push({
            url,
            pid: metric.pid,
            memory: metric.memory.workingSetSize * 1024, // Convert to bytes
            cpu: metric.cpu ? metric.cpu.percentCPUUsage : 0
          });
        }
      }
    }

    // Sort webviews by memory usage
    webviews.sort((a, b) => b.memory - a.memory);

    // Calculate app memory pressure based on total app memory
    const pressure = this.calculateAppPressure(totalAppMemory);

    const snapshot: SystemMemoryInfo = {
      timestamp: Date.now(),
      app: {
        totalMemory: totalAppMemory,
        mainProcess: mainProcessMemory,
        rendererProcesses,
        pressure
      },
      webviews
    };

    // Add to history
    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Log memory status
    const totalAppMB = totalAppMemory / 1024 / 1024;
    const mainMB = mainProcessMemory.rss / 1024 / 1024;
    const topWebview = webviews[0];
    
    if (pressure === 'high') {
      console.warn(`[MemoryMonitor] ⚠️ HIGH app memory usage!`, {
        totalApp: `${totalAppMB.toFixed(0)}MB`,
        mainProcess: `${mainMB.toFixed(0)}MB`,
        webviews: webviews.length,
        topWebview: topWebview ? `${new URL(topWebview.url).hostname} (${(topWebview.memory / 1024 / 1024).toFixed(0)}MB)` : 'none'
      });
    } else if (pressure === 'medium') {
      console.log(`[MemoryMonitor] ⚡ Moderate app memory usage - Total: ${totalAppMB.toFixed(0)}MB, Main: ${mainMB.toFixed(0)}MB, WebViews: ${webviews.length}`);
    } else {
      console.log(`[MemoryMonitor] 📊 App memory - Total: ${totalAppMB.toFixed(0)}MB, WebViews: ${webviews.length}`);
    }

    // Update metrics
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();

    return snapshot;
  }

  private calculateAppPressure(totalAppMemory: number): SystemMemoryInfo['app']['pressure'] {
    const appMemoryMB = totalAppMemory / 1024 / 1024;
    
    // Calculate pressure based on app memory usage
    // These thresholds are for the entire Electron app
    if (appMemoryMB > 4000) return 'high';    // Over 4GB is concerning
    if (appMemoryMB > 2000) return 'medium';  // Over 2GB warrants attention
    
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
    
    const recent = this.history.slice(-20); // Last 40 minutes (assuming 2-min intervals)
    
    const appMemoryValues = recent.map(s => s.app.totalMemory);
    const mainProcessValues = recent.map(s => s.app.mainProcess.rss);
    
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
      mainProcess: {
        average: mainProcessValues.reduce((a, b) => a + b, 0) / mainProcessValues.length,
        peak: Math.max(...mainProcessValues),
        current: mainProcessValues[mainProcessValues.length - 1]
      },
      pressureDistribution: {
        low: recent.filter(s => s.app.pressure === 'low').length,
        medium: recent.filter(s => s.app.pressure === 'medium').length,
        high: recent.filter(s => s.app.pressure === 'high').length
      },
      topMemoryConsumers: this.getTopMemoryConsumers(recent)
    };
  }

  private getTopMemoryConsumers(snapshots: SystemMemoryInfo[]) {
    const urlMemoryMap = new Map<string, number[]>();
    
    // Collect memory usage for each URL
    for (const snapshot of snapshots) {
      for (const webview of snapshot.webviews) {
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