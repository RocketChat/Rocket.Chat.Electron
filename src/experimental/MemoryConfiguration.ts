import * as fs from 'fs/promises';
import * as path from 'path';

import { app } from 'electron';

export interface FeatureConfig {
  enabled: boolean;
  priority: number; // 0-100, higher = more important
  customSettings?: Record<string, any>;
}

export interface SmartCleanupConfig extends FeatureConfig {
  customSettings?: {
    minCleanupInterval?: number; // milliseconds
    aggressiveMode?: boolean;
    clearStorage?: boolean;
    clearCaches?: boolean;
    maxHistorySize?: number;
    idleTimeThreshold?: number; // milliseconds
  };
}

export interface AutoReloadConfig extends FeatureConfig {
  customSettings?: {
    memoryWarningThreshold?: number; // bytes
    memoryCriticalThreshold?: number; // bytes
    memoryGrowthRateThreshold?: number; // bytes per minute
    minReloadInterval?: number; // milliseconds
    enablePrediction?: boolean;
    showNotifications?: boolean;
    excludeUrls?: string[];
  };
}

export interface MemoryMonitorConfig extends FeatureConfig {
  customSettings?: {
    monitorInterval?: number; // milliseconds
    maxHistorySize?: number;
    enableAlerts?: boolean;
    alertThresholds?: {
      warning?: number; // percentage
      critical?: number; // percentage
    };
    exportReports?: boolean;
    reportPath?: string;
  };
}

export interface MemoryLeakDetectorConfig extends FeatureConfig {
  customSettings?: {
    sampleInterval?: number; // milliseconds
    minSamplesForAnalysis?: number;
    confidenceThreshold?: number; // 0-1
    leakGrowthThreshold?: number; // bytes per minute
    enableAutoFix?: boolean;
    notifyOnDetection?: boolean;
  };
}

export interface PerformanceCollectorConfig extends FeatureConfig {
  customSettings?: {
    collectionInterval?: number; // milliseconds
    maxSnapshots?: number;
    enableProfiling?: boolean;
    cpuThreshold?: number; // percentage
    memoryThreshold?: number; // percentage
    fpsThreshold?: number;
    autoSaveReports?: boolean;
  };
}

export interface DOMOptimizationConfig extends FeatureConfig {
  customSettings?: {
    maxDOMNodes?: number;
    lazyLoadImages?: boolean;
    deferScripts?: boolean;
    removeUnusedCSS?: boolean;
    enableVirtualScrolling?: boolean;
    debounceScrollEvents?: number; // milliseconds
  };
}

export interface WebSocketManagerConfig extends FeatureConfig {
  customSettings?: {
    reconnectDelay?: number; // milliseconds
    maxReconnectAttempts?: number;
    heartbeatInterval?: number; // milliseconds
    messageQueueSize?: number;
    enableCompression?: boolean;
    autoReconnect?: boolean;
  };
}

export interface MemoryConfiguration {
  version: string;
  globalSettings: {
    enabled: boolean;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    maxMemoryUsage?: number; // bytes
    checkInterval?: number; // milliseconds
    autoOptimize?: boolean;
  };

  features: {
    smartCleanup: SmartCleanupConfig;
    autoReload: AutoReloadConfig;
    memoryMonitor: MemoryMonitorConfig;
    memoryLeakDetector: MemoryLeakDetectorConfig;
    performanceCollector: PerformanceCollectorConfig;
    domOptimization: DOMOptimizationConfig;
    webSocketManager: WebSocketManagerConfig;
  };

  profiles: {
    [key: string]: MemoryProfile;
  };
}

export interface MemoryProfile {
  name: string;
  description: string;
  features: Partial<MemoryConfiguration['features']>;
  triggers?: ProfileTrigger[];
}

export interface ProfileTrigger {
  type: 'memory' | 'cpu' | 'time' | 'event';
  condition: string;
  value: any;
}

/**
 * Memory Configuration Manager
 * Handles loading, saving, and managing configuration for all memory features
 */
export class MemoryConfigurationManager {
  private static instance: MemoryConfigurationManager | null = null;

  private configuration: MemoryConfiguration;

  private configPath: string;

  private activeProfile: string = 'default';

  private constructor() {
    this.configPath = path.join(app.getPath('userData'), 'memory-config.json');
    this.configuration = this.getDefaultConfiguration();
  }

  static getInstance(): MemoryConfigurationManager {
    if (!this.instance) {
      this.instance = new MemoryConfigurationManager();
    }
    return this.instance;
  }

  private getDefaultConfiguration(): MemoryConfiguration {
    return {
      version: '1.0.0',

      globalSettings: {
        enabled: true,
        debugMode: false,
        logLevel: 'info',
        maxMemoryUsage: 4 * 1024 * 1024 * 1024, // 4GB
        checkInterval: 30000, // 30 seconds
        autoOptimize: true,
      },

      features: {
        smartCleanup: {
          enabled: true,
          priority: 70,
          customSettings: {
            minCleanupInterval: 5 * 60 * 1000, // 5 minutes
            aggressiveMode: false,
            clearStorage: false,
            clearCaches: true,
            maxHistorySize: 50,
            idleTimeThreshold: 2 * 60 * 1000, // 2 minutes
          },
        },

        autoReload: {
          enabled: true,
          priority: 90,
          customSettings: {
            memoryWarningThreshold: 3.5 * 1024 * 1024 * 1024, // 3.5GB
            memoryCriticalThreshold: 3.8 * 1024 * 1024 * 1024, // 3.8GB
            memoryGrowthRateThreshold: 50 * 1024 * 1024, // 50MB/min
            minReloadInterval: 10 * 60 * 1000, // 10 minutes
            enablePrediction: true,
            showNotifications: true,
            excludeUrls: [],
          },
        },

        memoryMonitor: {
          enabled: true,
          priority: 100,
          customSettings: {
            monitorInterval: 2 * 60 * 1000, // 2 minutes
            maxHistorySize: 180,
            enableAlerts: true,
            alertThresholds: {
              warning: 75,
              critical: 90,
            },
            exportReports: true,
            reportPath: app.getPath('userData'),
          },
        },

        memoryLeakDetector: {
          enabled: true,
          priority: 80,
          customSettings: {
            sampleInterval: 30000, // 30 seconds
            minSamplesForAnalysis: 10,
            confidenceThreshold: 0.7,
            leakGrowthThreshold: 1024 * 1024, // 1MB/min
            enableAutoFix: false,
            notifyOnDetection: true,
          },
        },

        performanceCollector: {
          enabled: false, // Disabled by default for performance
          priority: 50,
          customSettings: {
            collectionInterval: 5000, // 5 seconds
            maxSnapshots: 720,
            enableProfiling: false,
            cpuThreshold: 80,
            memoryThreshold: 85,
            fpsThreshold: 30,
            autoSaveReports: true,
          },
        },

        domOptimization: {
          enabled: true,
          priority: 60,
          customSettings: {
            maxDOMNodes: 10000,
            lazyLoadImages: true,
            deferScripts: true,
            removeUnusedCSS: false,
            enableVirtualScrolling: true,
            debounceScrollEvents: 100,
          },
        },

        webSocketManager: {
          enabled: true,
          priority: 40,
          customSettings: {
            reconnectDelay: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            messageQueueSize: 1000,
            enableCompression: true,
            autoReconnect: true,
          },
        },
      },

      profiles: {
        default: {
          name: 'default',
          description: 'Balanced configuration for general use',
          features: {}, // Uses default feature settings
        },

        aggressive: {
          name: 'aggressive',
          description: 'Aggressive memory management for low-memory systems',
          features: {
            smartCleanup: {
              enabled: true,
              priority: 90,
              customSettings: {
                minCleanupInterval: 2 * 60 * 1000, // 2 minutes
                aggressiveMode: true,
                clearStorage: true,
                clearCaches: true,
              },
            },
            autoReload: {
              enabled: true,
              priority: 95,
              customSettings: {
                memoryWarningThreshold: 2 * 1024 * 1024 * 1024, // 2GB
                memoryCriticalThreshold: 2.5 * 1024 * 1024 * 1024, // 2.5GB
                minReloadInterval: 5 * 60 * 1000, // 5 minutes
              },
            },
          },
        },

        performance: {
          name: 'performance',
          description: 'Focus on performance monitoring and optimization',
          features: {
            performanceCollector: {
              enabled: true,
              priority: 90,
              customSettings: {
                collectionInterval: 1000, // 1 second
                enableProfiling: true,
              },
            },
            memoryLeakDetector: {
              enabled: true,
              priority: 85,
              customSettings: {
                sampleInterval: 10000, // 10 seconds
                enableAutoFix: true,
              },
            },
          },
        },

        minimal: {
          name: 'minimal',
          description: 'Minimal memory management for high-performance systems',
          features: {
            smartCleanup: {
              enabled: false,
              priority: 0,
            },
            autoReload: {
              enabled: false,
              priority: 0,
            },
            performanceCollector: {
              enabled: false,
              priority: 0,
            },
            memoryLeakDetector: {
              enabled: false,
              priority: 0,
            },
          },
        },
      },
    };
  }

  async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData) as MemoryConfiguration;

      // Merge with defaults to ensure all fields exist
      this.configuration = this.mergeWithDefaults(loadedConfig);

      console.log('[MemoryConfig] Configuration loaded from', this.configPath);
    } catch (error) {
      console.log('[MemoryConfig] No configuration found, using defaults');
      await this.saveConfiguration();
    }
  }

  async saveConfiguration(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.configuration, null, 2)
      );

      console.log('[MemoryConfig] Configuration saved to', this.configPath);
    } catch (error) {
      console.error('[MemoryConfig] Failed to save configuration:', error);
    }
  }

  private mergeWithDefaults(loaded: MemoryConfiguration): MemoryConfiguration {
    const defaults = this.getDefaultConfiguration();

    return {
      ...defaults,
      ...loaded,
      globalSettings: {
        ...defaults.globalSettings,
        ...loaded.globalSettings,
      },
      features: {
        ...defaults.features,
        ...loaded.features,
      },
      profiles: {
        ...defaults.profiles,
        ...loaded.profiles,
      },
    };
  }

  getConfiguration(): MemoryConfiguration {
    return this.configuration;
  }

  getFeatureConfig<T extends keyof MemoryConfiguration['features']>(
    feature: T
  ): MemoryConfiguration['features'][T] {
    const profileConfig = this.getActiveProfileConfig();

    if (profileConfig.features[feature]) {
      return {
        ...this.configuration.features[feature],
        ...profileConfig.features[feature],
      };
    }

    return this.configuration.features[feature];
  }

  async updateFeatureConfig<T extends keyof MemoryConfiguration['features']>(
    feature: T,
    config: Partial<MemoryConfiguration['features'][T]>
  ): Promise<void> {
    this.configuration.features[feature] = {
      ...this.configuration.features[feature],
      ...config,
    };

    await this.saveConfiguration();
  }

  async updateGlobalSettings(
    settings: Partial<MemoryConfiguration['globalSettings']>
  ): Promise<void> {
    this.configuration.globalSettings = {
      ...this.configuration.globalSettings,
      ...settings,
    };

    await this.saveConfiguration();
  }

  setActiveProfile(profileName: string): void {
    if (!this.configuration.profiles[profileName]) {
      throw new Error(`Profile ${profileName} does not exist`);
    }

    this.activeProfile = profileName;
    console.log(`[MemoryConfig] Switched to profile: ${profileName}`);
  }

  getActiveProfile(): string {
    return this.activeProfile;
  }

  getActiveProfileConfig(): MemoryProfile {
    return (
      this.configuration.profiles[this.activeProfile] ||
      this.configuration.profiles.default
    );
  }

  async createProfile(profile: MemoryProfile): Promise<void> {
    this.configuration.profiles[profile.name] = profile;
    await this.saveConfiguration();
  }

  async deleteProfile(profileName: string): Promise<void> {
    if (profileName === 'default') {
      throw new Error('Cannot delete default profile');
    }

    delete this.configuration.profiles[profileName];

    if (this.activeProfile === profileName) {
      this.activeProfile = 'default';
    }

    await this.saveConfiguration();
  }

  getProfiles(): string[] {
    return Object.keys(this.configuration.profiles);
  }

  isFeatureEnabled(feature: keyof MemoryConfiguration['features']): boolean {
    if (!this.configuration.globalSettings.enabled) {
      return false;
    }

    const config = this.getFeatureConfig(feature);
    return config.enabled;
  }

  getFeaturePriority(feature: keyof MemoryConfiguration['features']): number {
    const config = this.getFeatureConfig(feature);
    return config.priority;
  }

  async exportConfiguration(filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(this.configuration, null, 2));
    console.log(`[MemoryConfig] Configuration exported to ${filePath}`);
  }

  async importConfiguration(filePath: string): Promise<void> {
    const configData = await fs.readFile(filePath, 'utf-8');
    const importedConfig = JSON.parse(configData) as MemoryConfiguration;

    this.configuration = this.mergeWithDefaults(importedConfig);
    await this.saveConfiguration();

    console.log(`[MemoryConfig] Configuration imported from ${filePath}`);
  }

  async resetToDefaults(): Promise<void> {
    this.configuration = this.getDefaultConfiguration();
    this.activeProfile = 'default';
    await this.saveConfiguration();

    console.log('[MemoryConfig] Configuration reset to defaults');
  }
}
