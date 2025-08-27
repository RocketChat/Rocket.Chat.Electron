import { app, dialog } from 'electron';
import * as os from 'os';

import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

interface WebContentsMemoryState {
  url: string;
  webContents: WebContents;
  memoryHistory: number[];
  lastReload: number;
  reloadCount: number;
  growthRate: number;
  predictedCrashTime: number | null;
}

export interface ReloadEvent {
  timestamp: number;
  url: string;
  memoryBefore: number;
  memoryAfter: number;
  reason: 'memory_limit' | 'growth_rate' | 'predicted_crash' | 'manual';
  preventedCrash: boolean;
}

/**
 * Auto-reload Protection feature that monitors WebContents memory usage
 * and automatically reloads them before they hit memory limits.
 */
export class AutoReload extends MemoryFeature {
  private monitorInterval: NodeJS.Timeout | null = null;
  private webContentsStates = new Map<string, WebContentsMemoryState>();
  private reloadHistory: ReloadEvent[] = [];
  private maxHistorySize = 100;
  
  // Memory thresholds (in bytes)
  private readonly MEMORY_WARNING_THRESHOLD = 3.5 * 1024 * 1024 * 1024; // 3.5GB
  private readonly MEMORY_CRITICAL_THRESHOLD = 3.8 * 1024 * 1024 * 1024; // 3.8GB
  private readonly MEMORY_GROWTH_RATE_THRESHOLD = 50 * 1024 * 1024; // 50MB/min growth
  private readonly MIN_RELOAD_INTERVAL = 10 * 60 * 1000; // 10 minutes minimum between reloads
  
  getName(): string {
    return 'AutoReload';
  }

  protected async onEnable(): Promise<void> {
    this.startMonitoring();
    console.log('[AutoReload] Protection enabled with memory monitoring');
  }

  protected async onDisable(): Promise<void> {
    this.stopMonitoring();
    this.webContentsStates.clear();
    this.reloadHistory = [];
  }

  protected async onApplyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    // Initialize tracking for this WebContents
    this.webContentsStates.set(serverUrl, {
      url: serverUrl,
      webContents,
      memoryHistory: [],
      lastReload: 0,
      reloadCount: 0,
      growthRate: 0,
      predictedCrashTime: null
    });
    
    // Inject monitoring script
    try {
      await webContents.executeJavaScript(`
        // Auto-reload protection monitoring
        (function() {
          let lastMemoryWarning = 0;
          
          // Monitor memory periodically
          setInterval(() => {
            if (performance.memory) {
              const used = performance.memory.usedJSHeapSize;
              const limit = performance.memory.jsHeapSizeLimit;
              const percentUsed = (used / limit) * 100;
              
              // Warn if approaching limit
              if (percentUsed > 85 && Date.now() - lastMemoryWarning > 60000) {
                console.warn('[AutoReload] Memory usage high:', \`\${percentUsed.toFixed(1)}%\`);
                lastMemoryWarning = Date.now();
                
                // Save state to sessionStorage for recovery after reload
                try {
                  sessionStorage.setItem('autoReloadState', JSON.stringify({
                    timestamp: Date.now(),
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    activeElement: document.activeElement?.id
                  }));
                } catch (e) {
                  // Storage might be full
                }
              }
            }
          }, 30000); // Check every 30 seconds
          
          // Restore state after auto-reload
          const savedState = sessionStorage.getItem('autoReloadState');
          if (savedState) {
            try {
              const state = JSON.parse(savedState);
              // Only restore if reload was recent (within 1 minute)
              if (Date.now() - state.timestamp < 60000) {
                window.scrollTo(state.scrollX, state.scrollY);
                if (state.activeElement) {
                  document.getElementById(state.activeElement)?.focus();
                }
                console.log('[AutoReload] Restored state after reload');
              }
              sessionStorage.removeItem('autoReloadState');
            } catch (e) {
              // Invalid state
            }
          }
        })();
      `);
    } catch (error) {
      // WebContents might not be ready
    }
    
    console.log(`[AutoReload] Monitoring WebContents for ${serverUrl}`);
  }

  protected async onSystemResume(): Promise<void> {
    // After system resume, check all WebContents for memory issues
    console.log('[AutoReload] Checking memory after system resume');
    await this.checkAllWebContents();
  }

  private startMonitoring(): void {
    if (this.monitorInterval) {
      return;
    }

    // Monitor every 30 seconds
    this.monitorInterval = setInterval(async () => {
      await this.checkAllWebContents();
    }, 30000);
  }

  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private async checkAllWebContents(): Promise<void> {
    const appMetrics = app.getAppMetrics();
    console.log(`[AutoReload] 🔍 Checking ${this.webContentsStates.size} WebContents for memory issues`);
    
    for (const [url, state] of this.webContentsStates) {
      if (state.webContents.isDestroyed()) {
        this.webContentsStates.delete(url);
        continue;
      }
      
      // Find metrics for this WebContents
      const metric = appMetrics.find(m => m.webContents?.id === state.webContents.id);
      if (!metric) continue;
      
      const currentMemory = metric.memory.workingSetSize * 1024; // Convert to bytes
      const currentMemoryGB = currentMemory / 1024 / 1024 / 1024;
      
      if (currentMemoryGB > 2.5) {
        console.log(`[AutoReload] 📈 ${url}: ${currentMemoryGB.toFixed(2)}GB (approaching limit)`);
      }
      
      // Update memory history
      state.memoryHistory.push(currentMemory);
      if (state.memoryHistory.length > 10) {
        state.memoryHistory.shift();
      }
      
      // Calculate growth rate if we have enough history
      if (state.memoryHistory.length >= 3) {
        const oldMemory = state.memoryHistory[0];
        const timeSpan = (state.memoryHistory.length - 1) * 30000; // in ms
        state.growthRate = ((currentMemory - oldMemory) / timeSpan) * 60000; // bytes per minute
        
        // Predict when we might hit the limit
        if (state.growthRate > 0) {
          const remainingMemory = this.MEMORY_CRITICAL_THRESHOLD - currentMemory;
          state.predictedCrashTime = Date.now() + (remainingMemory / state.growthRate) * 60000;
        } else {
          state.predictedCrashTime = null;
        }
      }
      
      // Check if reload is needed
      const shouldReload = await this.shouldReloadWebContents(state, currentMemory);
      
      if (shouldReload) {
        await this.reloadWebContents(state, currentMemory);
      }
    }
  }

  private async shouldReloadWebContents(
    state: WebContentsMemoryState,
    currentMemory: number
  ): Promise<boolean> {
    const now = Date.now();
    const timeSinceLastReload = now - state.lastReload;
    
    // Don't reload too frequently
    if (timeSinceLastReload < this.MIN_RELOAD_INTERVAL) {
      return false;
    }
    
    // Check if memory is critical
    if (currentMemory >= this.MEMORY_CRITICAL_THRESHOLD) {
      console.warn(`[AutoReload] 🚨 CRITICAL: ${state.url} at ${(currentMemory / 1024 / 1024 / 1024).toFixed(2)}GB - MUST RELOAD!`);
      return true;
    }
    
    // Check if memory is high and growing fast
    if (currentMemory >= this.MEMORY_WARNING_THRESHOLD && state.growthRate > this.MEMORY_GROWTH_RATE_THRESHOLD) {
      const growthMBPerMin = state.growthRate / 1024 / 1024;
      console.warn(`[AutoReload] ⚠️ WARNING: ${state.url} at ${(currentMemory / 1024 / 1024 / 1024).toFixed(2)}GB, growing ${growthMBPerMin.toFixed(1)}MB/min`);
      return true;
    }
    
    // Check if crash is predicted within 5 minutes
    if (state.predictedCrashTime && state.predictedCrashTime - now < 5 * 60000) {
      const minutesUntilCrash = (state.predictedCrashTime - now) / 60000;
      console.warn(`[AutoReload] 🔮 PREDICTION: ${state.url} will crash in ${minutesUntilCrash.toFixed(1)} minutes!`);
      return true;
    }
    
    // Check system memory pressure
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const systemPressure = (totalMemory - freeMemory) / totalMemory;
    
    if (systemPressure > 0.9 && currentMemory > this.MEMORY_WARNING_THRESHOLD) {
      console.warn(`[AutoReload] 💥 SYSTEM PRESSURE: ${(systemPressure * 100).toFixed(1)}% memory used, reloading ${state.url}`);
      return true;
    }
    
    return false;
  }

  private async reloadWebContents(
    state: WebContentsMemoryState,
    memoryBefore: number
  ): Promise<void> {
    console.log(`[AutoReload] 🔄 RELOADING ${state.url} - Memory: ${(memoryBefore / 1024 / 1024 / 1024).toFixed(2)}GB`);
    
    // Determine reload reason
    let reason: ReloadEvent['reason'] = 'memory_limit';
    let reasonText = 'Memory limit reached';
    if (state.growthRate > this.MEMORY_GROWTH_RATE_THRESHOLD) {
      reason = 'growth_rate';
      reasonText = `Rapid growth (${(state.growthRate / 1024 / 1024).toFixed(1)}MB/min)`;
    } else if (state.predictedCrashTime) {
      reason = 'predicted_crash';
      reasonText = 'Crash predicted';
    }
    console.log(`[AutoReload] 📝 Reason: ${reasonText}`);
    
    try {
      // Save current state before reload
      await state.webContents.executeJavaScript(`
        sessionStorage.setItem('autoReloadState', JSON.stringify({
          timestamp: ${Date.now()},
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          activeElement: document.activeElement?.id,
          reason: '${reason}'
        }));
      `).catch(() => {
        // Might fail if page is unresponsive
      });
      
      // Perform the reload
      state.webContents.reload();
      
      // Update state
      state.lastReload = Date.now();
      state.reloadCount++;
      state.memoryHistory = []; // Reset history after reload
      
      // Wait a bit for reload to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get memory after reload
      const appMetrics = app.getAppMetrics();
      const metric = appMetrics.find(m => m.webContents?.id === state.webContents.id);
      const memoryAfter = metric ? metric.memory.workingSetSize * 1024 : 0;
      
      // Record the reload event
      const reloadEvent: ReloadEvent = {
        timestamp: Date.now(),
        url: state.url,
        memoryBefore,
        memoryAfter,
        reason,
        preventedCrash: memoryBefore >= this.MEMORY_CRITICAL_THRESHOLD
      };
      
      this.reloadHistory.push(reloadEvent);
      if (this.reloadHistory.length > this.maxHistorySize) {
        this.reloadHistory.shift();
      }
      
      // Update metrics
      this.metrics.activations++;
      this.metrics.lastRun = Date.now();
      this.metrics.memorySaved += Math.max(0, memoryBefore - memoryAfter);
      
      console.log(`[AutoReload] Reload completed for ${state.url}:`, {
        memorySaved: `${((memoryBefore - memoryAfter) / 1024 / 1024).toFixed(1)}MB`,
        reloadCount: state.reloadCount,
        reason
      });
      
      // Show notification if this prevented a likely crash
      if (reloadEvent.preventedCrash && state.reloadCount === 1) {
        this.showReloadNotification(state.url);
      }
      
    } catch (error) {
      console.error(`[AutoReload] Failed to reload ${state.url}:`, error);
    }
  }

  private showReloadNotification(url: string): void {
    // Only show notification if it's the first reload
    const serverName = new URL(url).hostname;
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Auto-reload Protection',
      message: `Server "${serverName}" was automatically reloaded to prevent a memory crash.`,
      detail: 'The experimental auto-reload protection feature detected high memory usage and reloaded the tab to maintain stability.',
      buttons: ['OK'],
      noLink: true
    });
  }

  /**
   * Get reload history for analysis
   */
  getReloadHistory(): ReloadEvent[] {
    return [...this.reloadHistory];
  }

  /**
   * Get current state of all monitored WebContents
   */
  getWebContentsStates(): Map<string, WebContentsMemoryState> {
    return new Map(this.webContentsStates);
  }

  /**
   * Manually trigger a reload for a specific URL
   */
  async manualReload(url: string): Promise<boolean> {
    const state = this.webContentsStates.get(url);
    if (!state || state.webContents.isDestroyed()) {
      return false;
    }
    
    const appMetrics = app.getAppMetrics();
    const metric = appMetrics.find(m => m.webContents?.id === state.webContents.id);
    const currentMemory = metric ? metric.memory.workingSetSize * 1024 : 0;
    
    await this.reloadWebContents(state, currentMemory);
    return true;
  }

  /**
   * Get predicted crash times for all WebContents
   */
  getPredictedCrashTimes(): Map<string, number | null> {
    const predictions = new Map<string, number | null>();
    for (const [url, state] of this.webContentsStates) {
      predictions.set(url, state.predictedCrashTime);
    }
    return predictions;
  }
}