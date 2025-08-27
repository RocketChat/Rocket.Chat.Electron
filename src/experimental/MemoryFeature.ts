import type { WebContents } from 'electron';

export interface FeatureMetrics {
  activations: number;
  memorySaved: number;
  lastRun: number;
}

/**
 * Base class for all memory features.
 * Each feature must implement this interface to be managed by ExperimentalMemoryManager.
 */
export abstract class MemoryFeature {
  protected enabled = false;
  protected metrics: FeatureMetrics = {
    activations: 0,
    memorySaved: 0,
    lastRun: 0,
  };

  /**
   * Get the feature name for logging and identification.
   */
  abstract getName(): string;

  /**
   * Enable the feature.
   */
  async enable(): Promise<void> {
    if (this.enabled) {
      return;
    }
    
    this.enabled = true;
    console.log(`[ExperimentalMemory] Enabling feature: ${this.getName()}`);
    await this.onEnable();
  }

  /**
   * Disable the feature.
   */
  async disable(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    this.enabled = false;
    console.log(`[ExperimentalMemory] Disabling feature: ${this.getName()}`);
    await this.onDisable();
  }

  /**
   * Check if the feature is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get metrics for this feature.
   */
  getMetrics(): FeatureMetrics {
    return { ...this.metrics };
  }

  /**
   * Apply this feature to a specific webcontents.
   */
  async applyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    await this.onApplyToWebContents(webContents, serverUrl);
  }

  /**
   * Handle system sleep event.
   */
  async handleSystemSleep(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    await this.onSystemSleep();
  }

  /**
   * Handle system resume event.
   */
  async handleSystemResume(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    console.log(`[ExperimentalMemory] ${this.getName()} handling system resume`);
    await this.onSystemResume();
    
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();
  }

  /**
   * Subclasses must implement these methods.
   */
  protected abstract onEnable(): Promise<void>;
  protected abstract onDisable(): Promise<void>;
  
  /**
   * Optional methods for subclasses to override.
   */
  protected async onApplyToWebContents(_webContents: WebContents, _serverUrl: string): Promise<void> {
    // Default: no-op
  }
  
  protected async onSystemSleep(): Promise<void> {
    // Default: no-op
  }
  
  protected async onSystemResume(): Promise<void> {
    // Default: no-op
  }

  /**
   * Update memory saved metric.
   */
  protected addMemorySaved(bytes: number): void {
    this.metrics.memorySaved += bytes;
  }
}