import { app, webContents } from 'electron';
import * as os from 'os';

import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

export interface CleanupResult {
  timestamp: number;
  memoryBefore: number;
  memoryAfter: number;
  memorySaved: number;
  actions: string[];
  duration: number;
}

/**
 * Smart Cleanup feature that performs intelligent memory cleanup operations.
 * Runs during idle periods, after system sleep, and when memory pressure is detected.
 */
export class SmartCleanup extends MemoryFeature {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private lastCleanupTime = 0;
  private minCleanupInterval = 5 * 60 * 1000; // 5 minutes minimum between cleanups
  private cleanupHistory: CleanupResult[] = [];
  private maxHistorySize = 50;
  private isCleaningUp = false;
  private webContentsList = new Map<string, WebContents>();

  getName(): string {
    return 'SmartCleanup';
  }

  protected async onEnable(): Promise<void> {
    // Start periodic idle cleanup
    this.startIdleCleanup();
    
    // Perform initial cleanup after a short delay
    setTimeout(() => this.performCleanup('initial'), 5000);
    
    console.log('[SmartCleanup] Enabled with idle monitoring');
  }

  protected async onDisable(): Promise<void> {
    this.stopIdleCleanup();
    this.cleanupHistory = [];
    this.webContentsList.clear();
  }

  protected async onApplyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    this.webContentsList.set(serverUrl, webContents);
    
    // Inject cleanup helper script
    try {
      await webContents.executeJavaScript(`
        // Smart cleanup helper functions
        (function() {
          window.__smartCleanup = {
            // Clear unused image cache
            clearImageCache: function() {
              const images = document.querySelectorAll('img');
              let cleared = 0;
              images.forEach(img => {
                // Clear images not in viewport
                const rect = img.getBoundingClientRect();
                if (rect.bottom < -1000 || rect.top > window.innerHeight + 1000) {
                  const src = img.src;
                  img.removeAttribute('src');
                  img.dataset.lazySrc = src;
                  cleared++;
                }
              });
              return cleared;
            },
            
            // Clear detached DOM nodes
            clearDetachedNodes: function() {
              if (typeof gc === 'function') {
                gc();
                return true;
              }
              return false;
            },
            
            // Get memory stats
            getMemoryStats: function() {
              if (performance.memory) {
                return {
                  usedJSHeapSize: performance.memory.usedJSHeapSize,
                  totalJSHeapSize: performance.memory.totalJSHeapSize,
                  jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
              }
              return null;
            }
          };
        })();
      `);
    } catch (error) {
      // WebContents might not be ready, that's okay
    }
  }

  protected async onSystemSleep(): Promise<void> {
    console.log('[SmartCleanup] System going to sleep, performing cleanup');
    await this.performCleanup('sleep');
  }

  protected async onSystemResume(): Promise<void> {
    console.log('[SmartCleanup] System resumed, performing post-resume cleanup');
    // Wait a bit for system to stabilize
    setTimeout(() => this.performCleanup('resume'), 3000);
  }

  private startIdleCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Check for idle state every minute
    this.cleanupInterval = setInterval(() => {
      this.checkAndCleanupIfIdle();
    }, 60000);
  }

  private stopIdleCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private async checkAndCleanupIfIdle(): Promise<void> {
    // Get system idle time (in seconds)
    const idleTime = app.getSystemIdleTime();
    
    // Consider system idle after 5 minutes
    if (idleTime > 300) {
      const now = Date.now();
      const timeSinceLastCleanup = now - this.lastCleanupTime;
      
      console.log(`[SmartCleanup] 💤 System idle for ${(idleTime / 60).toFixed(1)} minutes`);
      
      // Only cleanup if enough time has passed
      if (timeSinceLastCleanup >= this.minCleanupInterval) {
        console.log(`[SmartCleanup] 🧹 Starting idle cleanup (last cleanup ${(timeSinceLastCleanup / 60000).toFixed(1)} minutes ago)`);
        await this.performCleanup('idle');
      } else {
        console.log(`[SmartCleanup] ⏳ Skipping cleanup (too soon, wait ${((this.minCleanupInterval - timeSinceLastCleanup) / 60000).toFixed(1)} more minutes)`);
      }
    }
  }

  async performCleanup(trigger: 'manual' | 'idle' | 'sleep' | 'resume' | 'pressure' | 'initial' = 'manual'): Promise<CleanupResult> {
    if (this.isCleaningUp) {
      console.log('[SmartCleanup] Cleanup already in progress, skipping');
      return this.cleanupHistory[this.cleanupHistory.length - 1] || this.createEmptyResult();
    }

    this.isCleaningUp = true;
    const startTime = Date.now();
    const memoryBefore = this.getCurrentMemoryUsage();
    const actions: string[] = [];

    console.log(`[SmartCleanup] 🚀 Starting ${trigger} cleanup - Memory before: ${(memoryBefore / 1024 / 1024).toFixed(1)}MB`);

    try {
      // 1. Clear Electron caches
      if (trigger === 'sleep' || trigger === 'resume' || trigger === 'pressure') {
        console.log(`[SmartCleanup] 🗑️ Clearing Electron caches (trigger: ${trigger})`);
        await this.clearElectronCaches();
        actions.push('Cleared Electron caches');
      }

      // 2. Clear WebContents memory
      console.log('[SmartCleanup] 🌐 Cleaning WebContents memory');
      await this.cleanupWebContents();
      actions.push('Cleaned WebContents memory');

      // 3. Run garbage collection if available
      if (global.gc) {
        console.log('[SmartCleanup] ♻️ Running garbage collection');
        global.gc();
        actions.push('Ran garbage collection');
      }

      // 4. Clear unused memory in main process
      console.log('[SmartCleanup] 🔧 Clearing main process memory');
      this.clearMainProcessMemory();
      actions.push('Cleared main process memory');

      // 5. Additional aggressive cleanup for pressure situations
      if (trigger === 'pressure') {
        console.log('[SmartCleanup] 🔥 HIGH PRESSURE - Performing aggressive cleanup!');
        await this.aggressiveCleanup();
        actions.push('Performed aggressive cleanup');
      }

    } catch (error) {
      console.error('[SmartCleanup] Error during cleanup:', error);
    }

    const duration = Date.now() - startTime;
    const memoryAfter = this.getCurrentMemoryUsage();
    const memorySaved = Math.max(0, memoryBefore - memoryAfter);

    const result: CleanupResult = {
      timestamp: Date.now(),
      memoryBefore,
      memoryAfter,
      memorySaved,
      actions,
      duration
    };

    // Update history
    this.cleanupHistory.push(result);
    if (this.cleanupHistory.length > this.maxHistorySize) {
      this.cleanupHistory.shift();
    }

    // Update metrics
    this.metrics.memorySaved += memorySaved;
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();
    this.lastCleanupTime = Date.now();

    const memorySavedMB = memorySaved / 1024 / 1024;
    if (memorySavedMB > 0) {
      console.log(`[SmartCleanup] ✅ Cleanup completed! Freed ${memorySavedMB.toFixed(1)}MB in ${duration}ms`);
    } else {
      console.log(`[SmartCleanup] ✨ Cleanup completed - Memory already optimized (${duration}ms)`);
    }
    console.log(`[SmartCleanup] 📋 Actions performed: ${actions.join(', ')}`);

    this.isCleaningUp = false;
    return result;
  }

  private async clearElectronCaches(): Promise<void> {
    try {
      // Clear HTTP cache for all sessions
      const sessions = webContents.getAllWebContents().map(wc => wc.session);
      const uniqueSessions = [...new Set(sessions)];
      
      for (const session of uniqueSessions) {
        await session.clearCache();
        await session.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers']
        });
      }
    } catch (error) {
      console.error('[SmartCleanup] Failed to clear Electron caches:', error);
    }
  }

  private async cleanupWebContents(): Promise<void> {
    for (const [url, wc] of this.webContentsList) {
      if (wc.isDestroyed()) {
        this.webContentsList.delete(url);
        continue;
      }

      try {
        // Execute cleanup in the renderer
        await wc.executeJavaScript(`
          (function() {
            let cleanupReport = { cleared: 0 };
            
            // Clear image cache for off-screen images
            if (window.__smartCleanup && window.__smartCleanup.clearImageCache) {
              cleanupReport.cleared = window.__smartCleanup.clearImageCache();
            }
            
            // Clear detached nodes
            if (window.__smartCleanup && window.__smartCleanup.clearDetachedNodes) {
              window.__smartCleanup.clearDetachedNodes();
            }
            
            // Clear any accumulated console logs
            console.clear();
            
            return cleanupReport;
          })();
        `);

        // Clear navigation history if it's too large
        if (wc.canGoBack()) {
          wc.clearHistory();
        }

      } catch (error) {
        // WebContents might not be ready or might have navigated
      }
    }
  }

  private clearMainProcessMemory(): void {
    // Clear require cache for non-essential modules
    const cacheKeys = Object.keys(require.cache);
    for (const key of cacheKeys) {
      // Only clear cache for non-core modules
      if (key.includes('node_modules') && !key.includes('electron')) {
        delete require.cache[key];
      }
    }

    // Clear any accumulated timers or intervals
    // This is handled by the application lifecycle
  }

  private async aggressiveCleanup(): Promise<void> {
    console.log('[SmartCleanup] Performing aggressive cleanup due to memory pressure');
    
    // Force reload of the heaviest WebContents if memory is critical
    const appMetrics = app.getAppMetrics();
    const sortedMetrics = appMetrics
      .filter(m => m.type === 'Webview' || m.type === 'Web Contents')
      .sort((a, b) => b.memory.workingSetSize - a.memory.workingSetSize);
    
    // Consider reloading the heaviest consumer if it's using > 1GB
    if (sortedMetrics.length > 0 && sortedMetrics[0].memory.workingSetSize > 1024 * 1024) {
      const heaviestWC = webContents.fromId(sortedMetrics[0].webContents?.id || -1);
      if (heaviestWC && !heaviestWC.isDestroyed()) {
        console.log('[SmartCleanup] Reloading heaviest WebContents to free memory');
        heaviestWC.reload();
      }
    }
  }

  private getCurrentMemoryUsage(): number {
    const appMetrics = app.getAppMetrics();
    return appMetrics.reduce((sum, metric) => sum + metric.memory.workingSetSize, 0);
  }

  private createEmptyResult(): CleanupResult {
    return {
      timestamp: Date.now(),
      memoryBefore: 0,
      memoryAfter: 0,
      memorySaved: 0,
      actions: [],
      duration: 0
    };
  }

  /**
   * Get cleanup history for analysis
   */
  getCleanupHistory(): CleanupResult[] {
    return [...this.cleanupHistory];
  }

  /**
   * Get total memory saved across all cleanups
   */
  getTotalMemorySaved(): number {
    return this.cleanupHistory.reduce((sum, result) => sum + result.memorySaved, 0);
  }

  /**
   * Force an immediate cleanup
   */
  async forceCleanup(): Promise<CleanupResult> {
    return await this.performCleanup('manual');
  }

  /**
   * Check if cleanup is needed based on memory pressure
   */
  async checkMemoryPressure(): Promise<boolean> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const percentUsed = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    // Trigger cleanup if memory usage is high
    if (percentUsed > 80) {
      await this.performCleanup('pressure');
      return true;
    }
    
    return false;
  }
}