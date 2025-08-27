import type { WebContents } from 'electron';

import type { MemoryFeature } from './MemoryFeature';
import { MemoryMonitor } from './features/MemoryMonitor';
import { SmartCleanup } from './features/SmartCleanup';
import { AutoReload } from './features/AutoReload';
import { DOMOptimization } from './features/DOMOptimization';
import { WebSocketManager } from './features/WebSocketManager';

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
    
    console.log('[ExperimentalMemory] Manager initialized');
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
    console.log(`[ExperimentalMemory] Registering feature: ${name}`);
    this.features.set(name, feature);
  }

  /**
   * Enable the memory manager (but not individual features).
   */
  async enable(): Promise<void> {
    if (this.enabled) {
      return;
    }

    console.log('[ExperimentalMemory] Manager enabled (features must be enabled individually)');
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

    console.log('[ExperimentalMemory] Disabling all features');
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
    // Only allow toggling features if the manager is enabled
    if (!this.enabled && enabled) {
      console.warn(`[ExperimentalMemory] Cannot enable feature ${name}: manager is disabled`);
      return;
    }
    
    const feature = this.features.get(name);
    
    if (!feature) {
      console.warn(`[ExperimentalMemory] Unknown feature: ${name}`);
      return;
    }

    if (enabled) {
      await feature.enable();
    } else {
      await feature.disable();
    }
  }

  /**
   * Apply features to a WebContents instance.
   */
  async applyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log(`[ExperimentalMemory] Applying enabled features to WebContents for ${serverUrl}`);
    this.webContentsList.set(serverUrl, webContents);

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
    console.log(`[ExperimentalMemory] WebContents destroyed for ${serverUrl}`);
    this.webContentsList.delete(serverUrl);
  }

  /**
   * Handle system sleep event.
   */
  async handleSystemSleep(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log('[ExperimentalMemory] System going to sleep');
    
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

    console.log('[ExperimentalMemory] System resumed from sleep');
    
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
   * Get all WebContents being managed.
   */
  getWebContentsList(): Map<string, WebContents> {
    return new Map(this.webContentsList);
  }
}