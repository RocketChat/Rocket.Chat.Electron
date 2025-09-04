import type { WebContents } from 'electron';
import { app } from 'electron';

import type { MemoryFeature } from './MemoryFeature';
import { MemoryMonitor } from './features/MemoryMonitor';
import { SmartCleanup } from './features/SmartCleanup';
import { AutoReload } from './features/AutoReload';
import { DOMOptimization } from './features/DOMOptimization';
import { WebSocketManager } from './features/WebSocketManager';
import { MemoryLeakDetector } from './features/MemoryLeakDetector';
import { PerformanceCollector } from './features/PerformanceCollector';
import { MemoryConfigurationManager } from './MemoryConfiguration';

export interface MemoryMetrics {
  memorySaved: number;
  interventions: number;
  lastCleanup: number;
}

/**
 * Singleton manager for experimental memory features.
 * Coordinates all memory management features and provides a unified interface.
 */
export class ExperimentalMemoryManager {
  private static instance: ExperimentalMemoryManager | null = null;
  private features: Map<string, MemoryFeature>;
  private enabled = false;
  private webContentsList: Map<string, WebContents> = new Map();

  private constructor() {
    this.features = new Map();
    
    // Register all memory features
    this.registerFeature('monitoring', new MemoryMonitor());
    this.registerFeature('smartCleanup', new SmartCleanup());
    this.registerFeature('autoReload', new AutoReload());
    this.registerFeature('domOptimization', new DOMOptimization());
    this.registerFeature('websocket', new WebSocketManager());
    this.registerFeature('leakDetector', new MemoryLeakDetector());
    this.registerFeature('performanceCollector', new PerformanceCollector());
    
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): ExperimentalMemoryManager {
    if (!ExperimentalMemoryManager.instance) {
      ExperimentalMemoryManager.instance = new ExperimentalMemoryManager();
    }
    return ExperimentalMemoryManager.instance;
  }

  /**
   * Register a memory feature.
   */
  registerFeature(name: string, feature: MemoryFeature): void {
    this.features.set(name, feature);
  }

  /**
   * Enable the memory manager (but not individual features).
   */
  async enable(): Promise<void> {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    
    // Don't automatically enable features - they need to be enabled individually
  }

  /**
   * Disable all memory features.
   */
  async disable(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    
    // Disable all features
    for (const [name, feature] of this.features) {
      try {
        await feature.disable();
      } catch (error) {
        console.error(`[ExperimentalMemory] Failed to disable feature ${name}:`, error);
      }
    }
  }

  /**
   * Toggle a specific feature.
   */
  async toggleFeature(name: string, enabled: boolean): Promise<void> {
    const feature = this.features.get(name);
    
    if (!feature) {
      return;
    }

    // Allow disabling at any time, but only enable if manager is enabled
    if (enabled && !this.enabled) {
      return;
    }

    if (enabled) {
      await feature.enable();
      
      // Apply feature to all existing WebContents
      for (const [url, wc] of this.webContentsList) {
        if (!wc.isDestroyed()) {
          try {
            await feature.applyToWebContents(wc, url);
          } catch (error) {
            console.error(`[ExperimentalMemory] Failed to apply ${name} to ${url}:`, error);
          }
        }
      }
    } else {
      await feature.disable();
    }
  }

  /**
   * Apply features to a WebContents instance.
   */
  async applyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    // Always track the webcontents, even if manager is not enabled yet
    // This ensures we have them available when features are enabled later
    this.webContentsList.set(serverUrl, webContents);

    if (!this.enabled) {
      return;
    }

    
    for (const [name, feature] of this.features) {
      // Only apply if the feature is enabled
      if (feature.isEnabled()) {
        try {
          await feature.applyToWebContents(webContents, serverUrl);
        } catch (error) {
          console.error(`[ExperimentalMemory] Failed to apply feature ${name} to WebContents:`, error);
        }
      }
    }
  }

  /**
   * Handle WebContents destruction.
   */
  handleWebContentsDestroyed(serverUrl: string): void {
    this.webContentsList.delete(serverUrl);
  }

  /**
   * Handle system sleep event.
   */
  async handleSystemSleep(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    
    for (const [name, feature] of this.features) {
      try {
        await feature.handleSystemSleep();
      } catch (error) {
        console.error(`[ExperimentalMemory] Feature ${name} failed to handle sleep:`, error);
      }
    }
  }

  /**
   * Handle system resume event.
   */
  async handleSystemResume(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    
    for (const [name, feature] of this.features) {
      try {
        await feature.handleSystemResume();
      } catch (error) {
        console.error(`[ExperimentalMemory] Feature ${name} failed to handle resume:`, error);
      }
    }
  }

  /**
   * Get aggregated metrics from all features.
   */
  getMetrics(): MemoryMetrics {
    let totalMemorySaved = 0;
    let totalInterventions = 0;
    let lastCleanup = 0;

    for (const feature of this.features.values()) {
      const metrics = feature.getMetrics();
      totalMemorySaved += metrics.memorySaved;
      totalInterventions += metrics.activations;
      lastCleanup = Math.max(lastCleanup, metrics.lastRun);
    }

    return {
      memorySaved: totalMemorySaved,
      interventions: totalInterventions,
      lastCleanup,
    };
  }

  /**
   * Check if manager is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get a specific feature.
   */
  getFeature(name: string): MemoryFeature | undefined {
    return this.features.get(name);
  }

  /**
   * Get the current list of tracked WebContents.
   */
  getWebContentsList(): Map<string, WebContents> {
    return new Map(this.webContentsList);
  }

  /**
   * Get all WebContents being managed.
   */
  getWebContents(): WebContents[] {
    return Array.from(this.webContentsList.values()).filter(wc => !wc.isDestroyed());
  }

  /**
   * Get list of enabled features.
   */
  getEnabledFeatures(): string[] {
    const enabledFeatures: string[] = [];
    for (const [name, feature] of this.features) {
      if (feature.isEnabled()) {
        enabledFeatures.push(name);
      }
    }
    return enabledFeatures;
  }

  /**
   * Enable a specific feature.
   */
  async enableFeature(name: string): Promise<void> {
    await this.toggleFeature(name, true);
  }

  /**
   * Disable a specific feature.
   */
  async disableFeature(name: string): Promise<void> {
    await this.toggleFeature(name, false);
  }
  
  /**
   * Set feature enabled state (alias for toggleFeature).
   */
  async setFeatureEnabled(name: string, enabled: boolean): Promise<void> {
    await this.toggleFeature(name, enabled);
  }

  /**
   * Get memory information for all webContents.
   */
  getWebContentsMemory(): Array<{ id: number; url: string; memory: number }> {
    const webContentsMemory: Array<{ id: number; url: string; memory: number }> = [];
    const metrics = app.getAppMetrics();
    
    for (const [url, wc] of this.webContentsList) {
      if (!wc.isDestroyed()) {
        const metric = metrics.find(m => (m as any).webContents?.id === wc.id);
        if (metric) {
          webContentsMemory.push({
            id: wc.id,
            url,
            memory: metric.memory.workingSetSize * 1024, // Convert KB to bytes
          });
        }
      }
    }
    
    return webContentsMemory;
  }

  /**
   * Register a new WebContents (alias for applyToWebContents).
   */
  async registerWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    await this.applyToWebContents(webContents, serverUrl);
  }

  /**
   * Reload configuration from the configuration manager.
   */
  async reloadConfiguration(): Promise<void> {
    const configManager = MemoryConfigurationManager.getInstance();
    await configManager.loadConfiguration();
    
    
    // Apply configuration to features
    for (const [name, feature] of this.features) {
      const config = configManager.getFeatureConfig(name as any);
      if (config) {
        if (config.enabled && !feature.isEnabled()) {
          await feature.enable();
        } else if (!config.enabled && feature.isEnabled()) {
          await feature.disable();
        }
      }
    }
  }

  /**
   * Generate a comprehensive report.
   */
  async generateReport(): Promise<any> {
    const report: any = {
      timestamp: Date.now(),
      duration: Date.now() - (this.startTime || Date.now()),
      enabled: this.enabled,
      features: {},
      metrics: this.getMetrics(),
      interventions: [],
      webContents: this.getWebContentsMemory(),
    };
    
    // Collect feature reports
    for (const [name, feature] of this.features) {
      report.features[name] = {
        enabled: feature.isEnabled(),
        metrics: feature.getMetrics(),
      };
      
      // Add feature-specific data
      if (name === 'leakDetector') {
        const leakDetector = feature as any;
        report.leaks = leakDetector.getDetectedLeaks?.() || [];
      }
      
      if (name === 'performanceCollector') {
        const collector = feature as any;
        try {
          report.performance = collector.generateReport?.();
        } catch (error) {
          // Ignore if not enough data
        }
      }
    }
    
    return report;
  }

  /**
   * Export data as CSV.
   */
  exportCSV(): string {
    const headers = ['timestamp', 'feature', 'metric', 'value'];
    const rows: any[] = [];
    
    for (const [name, feature] of this.features) {
      const metrics = feature.getMetrics();
      rows.push([
        Date.now(),
        name,
        'activations',
        metrics.activations,
      ]);
      rows.push([
        Date.now(),
        name,
        'memorySaved',
        metrics.memorySaved,
      ]);
    }
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private startTime: number = Date.now();
}