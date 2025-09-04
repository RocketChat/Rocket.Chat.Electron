import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ExperimentalMemoryManager } from '../ExperimentalMemoryManager';
import { MemoryConfigurationManager } from '../MemoryConfiguration';
import { MemoryProfiler } from '../utils/MemoryProfiler';
import { MemoryPressurePredictor } from '../utils/MemoryPressurePredictor';
import { createMockWebContents, createMockMemoryInfo, simulateMemoryPressure, advanceTimersAndFlush } from './setup';
import { app, webContents, powerMonitor } from 'electron';

describe('ExperimentalMemoryManager Integration', () => {
  let memoryManager: ExperimentalMemoryManager;
  let configManager: MemoryConfigurationManager;
  let mockWebContents: any[];

  beforeEach(async () => {
    // Get singleton instances
    memoryManager = ExperimentalMemoryManager.getInstance();
    configManager = MemoryConfigurationManager.getInstance();
    
    // Reset configuration to defaults
    await configManager.resetToDefaults();
    
    // Create mock webContents
    mockWebContents = [
      createMockWebContents({ 
        id: 1,
        getURL: jest.fn(() => 'https://app1.example.com'),
        reload: jest.fn(),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      }),
      createMockWebContents({ 
        id: 2,
        getURL: jest.fn(() => 'https://app2.example.com'),
        reload: jest.fn(),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      }),
    ];
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue(mockWebContents);
    (app.getAppMetrics as jest.Mock).mockReturnValue([
      { 
        pid: 1, 
        type: 'Browser', 
        memory: createMockMemoryInfo({ workingSetSize: 200 * 1024 }) 
      },
      { 
        pid: 2, 
        type: 'Renderer',
        webContents: mockWebContents[0],
        memory: createMockMemoryInfo({ workingSetSize: 500 * 1024 }) 
      },
      { 
        pid: 3, 
        type: 'Renderer',
        webContents: mockWebContents[1],
        memory: createMockMemoryInfo({ workingSetSize: 400 * 1024 }) 
      },
    ]);
  });

  afterEach(async () => {
    await memoryManager.disable();
    jest.clearAllMocks();
  });

  describe('Manager Lifecycle', () => {
    it('should be a singleton', () => {
      const instance1 = ExperimentalMemoryManager.getInstance();
      const instance2 = ExperimentalMemoryManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should enable all configured features', async () => {
      await memoryManager.enable();
      
      const enabledFeatures = memoryManager.getEnabledFeatures();
      expect(enabledFeatures).toContain('monitoring');
      expect(enabledFeatures).toContain('smartCleanup');
      expect(enabledFeatures).toContain('autoReload');
    });

    it('should disable all features when disabled', async () => {
      await memoryManager.enable();
      await memoryManager.disable();
      
      const enabledFeatures = memoryManager.getEnabledFeatures();
      expect(enabledFeatures).toHaveLength(0);
    });

    it('should enable/disable individual features', async () => {
      await memoryManager.enable();
      
      // Disable specific feature
      await memoryManager.disableFeature('autoReload');
      let enabledFeatures = memoryManager.getEnabledFeatures();
      expect(enabledFeatures).not.toContain('autoReload');
      
      // Re-enable feature
      await memoryManager.enableFeature('autoReload');
      enabledFeatures = memoryManager.getEnabledFeatures();
      expect(enabledFeatures).toContain('autoReload');
    });
  });

  describe('Configuration Integration', () => {
    it('should load configuration on enable', async () => {
      // Set custom configuration
      await configManager.updateFeatureConfig('smartCleanup', {
        customSettings: {
          minCleanupInterval: 1000, // 1 second for testing
        },
      });
      
      await memoryManager.enable();
      
      // Verify configuration is applied
      const feature = memoryManager.getFeature('smartCleanup');
      expect(feature).toBeDefined();
    });

    it('should respect feature priorities', async () => {
      // Set different priorities
      await configManager.updateFeatureConfig('autoReload', { priority: 100 });
      await configManager.updateFeatureConfig('smartCleanup', { priority: 50 });
      
      await memoryManager.enable();
      
      // Features should be initialized in priority order
      const enabledFeatures = memoryManager.getEnabledFeatures();
      expect(enabledFeatures[0]).toBe('monitoring'); // Default priority 100
      expect(enabledFeatures[1]).toBe('autoReload'); // Priority 100
    });

    it('should switch profiles dynamically', async () => {
      await memoryManager.enable();
      
      // Switch to aggressive profile
      configManager.setActiveProfile('aggressive');
      await memoryManager.reloadConfiguration();
      
      // Verify aggressive settings are applied
      const config = configManager.getFeatureConfig('smartCleanup');
      expect(config.customSettings?.aggressiveMode).toBe(true);
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should collect memory metrics', async () => {
      // Let monitoring run
      await advanceTimersAndFlush(10000);
      
      const metrics = memoryManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.memorySaved).toBeGreaterThanOrEqual(0);
      expect(metrics.interventions).toBeGreaterThanOrEqual(0);
    });

    it('should track memory across all webContents', async () => {
      await advanceTimersAndFlush(10000);
      
      const webContentsMemory = memoryManager.getWebContentsMemory();
      expect(webContentsMemory).toHaveLength(2);
      expect(webContentsMemory[0]).toHaveProperty('id');
      expect(webContentsMemory[0]).toHaveProperty('url');
      expect(webContentsMemory[0]).toHaveProperty('memory');
    });
  });

  describe('Memory Pressure Response', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should trigger cleanup under memory pressure', async () => {
      simulateMemoryPressure('critical');
      
      // Mock high memory usage
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          memory: createMockMemoryInfo({ workingSetSize: 3500 * 1024 }) 
        },
      ]);
      
      // Trigger memory check
      await advanceTimersAndFlush(5000);
      
      // Verify cleanup was triggered
      expect(mockWebContents[0].executeJavaScript).toHaveBeenCalled();
    });

    it('should reload tabs when memory is critical', async () => {
      // Mock critical memory usage
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3900 * 1024 }) 
        },
      ]);
      
      // Trigger monitoring
      await advanceTimersAndFlush(60000);
      
      // Verify reload was triggered
      expect(mockWebContents[0].reload).toHaveBeenCalled();
    });
  });

  describe('Memory Leak Detection', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should detect steady memory growth', async () => {
      // Simulate steady memory growth
      const baseMemory = 1000 * 1024;
      const growthPerCheck = 50 * 1024;
      
      for (let i = 0; i < 15; i++) {
        (app.getAppMetrics as jest.Mock).mockReturnValue([
          { 
            pid: 1, 
            type: 'Renderer',
            webContents: mockWebContents[0],
            memory: createMockMemoryInfo({ 
              workingSetSize: baseMemory + (i * growthPerCheck) 
            }) 
          },
        ]);
        
        await advanceTimersAndFlush(30000); // 30 seconds
      }
      
      // Check for leak detection
      const leakDetector = memoryManager.getFeature('leakDetector') as any;
      const leaks = leakDetector.getDetectedLeaks();
      
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].type).toBe('steady_growth');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      // Enable performance collector
      await configManager.updateFeatureConfig('performanceCollector', {
        enabled: true,
      });
      await memoryManager.enable();
    });

    it('should collect performance metrics', async () => {
      await advanceTimersAndFlush(5000);
      
      const performanceCollector = memoryManager.getFeature('performanceCollector') as any;
      const metrics = performanceCollector.getMetrics();
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('category');
      expect(metrics[0]).toHaveProperty('value');
    });

    it('should generate performance report', async () => {
      // Collect data
      for (let i = 0; i < 5; i++) {
        await advanceTimersAndFlush(5000);
      }
      
      const performanceCollector = memoryManager.getFeature('performanceCollector') as any;
      const report = performanceCollector.generateReport();
      
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('performanceScore');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('Memory Prediction', () => {
    let predictor: MemoryPressurePredictor;

    beforeEach(async () => {
      predictor = new MemoryPressurePredictor();
      await memoryManager.enable();
    });

    it('should predict future memory usage', () => {
      // Add historical data points
      const baseMemory = 1000 * 1024 * 1024;
      const growthRate = 10 * 1024 * 1024; // 10MB per minute
      
      for (let i = 0; i < 20; i++) {
        predictor.addDataPoint({
          timestamp: Date.now() + i * 60000,
          memory: baseMemory + (i * growthRate),
          cpu: 50,
          eventLoopLag: 10,
        });
      }
      
      const prediction = predictor.predict();
      
      expect(prediction).not.toBeNull();
      expect(prediction?.predictedMemory).toBeGreaterThan(prediction?.currentMemory);
      expect(prediction?.timeToLimit).not.toBeNull();
      expect(prediction?.risk).not.toBe('low');
    });

    it('should assess risk levels correctly', () => {
      // Add data approaching memory limit
      const limit = 4 * 1024 * 1024 * 1024;
      
      for (let i = 0; i < 15; i++) {
        predictor.addDataPoint({
          timestamp: Date.now() + i * 60000,
          memory: limit * 0.8 + (i * 10 * 1024 * 1024),
          cpu: 70,
          eventLoopLag: 20,
        });
      }
      
      const prediction = predictor.predict();
      
      expect(prediction?.risk).toMatch(/high|critical/);
      expect(prediction?.recommendation).toContain('action');
    });
  });

  describe('Memory Profiling', () => {
    it('should create memory profiles', async () => {
      const profileId = await MemoryProfiler.startProfiling({
        duration: 1000,
        interval: 100,
        includeSnapshots: false,
      });
      
      expect(profileId).toBeDefined();
      
      await advanceTimersAndFlush(1100);
      
      const profile = await MemoryProfiler.stopProfiling(profileId);
      
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('summary');
      expect(profile.summary).toHaveProperty('memoryGrowth');
    });

    it('should detect memory leaks in profile', async () => {
      const leaks = await MemoryProfiler.detectLeaks();
      
      expect(Array.isArray(leaks)).toBe(true);
      // May or may not detect leaks in test environment
    });
  });

  describe('System Events', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should handle system sleep/resume', async () => {
      // Simulate system sleep
      await memoryManager.handleSystemSleep();
      
      // Features should prepare for sleep
      const cleanupFeature = memoryManager.getFeature('smartCleanup');
      expect(cleanupFeature).toBeDefined();
      
      // Simulate system resume
      await memoryManager.handleSystemResume();
      
      // Should trigger cleanup after resume
      await advanceTimersAndFlush(0);
      expect(mockWebContents[0].executeJavaScript).toHaveBeenCalled();
    });

    it('should apply features to new webContents', async () => {
      const newWebContents = createMockWebContents({
        id: 3,
        getURL: jest.fn(() => 'https://new.example.com'),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      });
      
      await memoryManager.registerWebContents(newWebContents, 'https://new.example.com');
      
      // New webContents should be tracked
      const webContentsMemory = memoryManager.getWebContentsMemory();
      expect(webContentsMemory.find(w => w.id === 3)).toBeDefined();
    });
  });

  describe('Feature Coordination', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should coordinate cleanup and reload features', async () => {
      // Simulate high memory that triggers both cleanup and reload consideration
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3600 * 1024 }) 
        },
      ]);
      
      // First, cleanup should run
      await advanceTimersAndFlush(5000);
      expect(mockWebContents[0].executeJavaScript).toHaveBeenCalled();
      
      // If memory still high, reload should trigger
      await advanceTimersAndFlush(60000);
      expect(mockWebContents[0].reload).toHaveBeenCalled();
    });

    it('should respect feature priorities in execution order', async () => {
      const executionOrder: string[] = [];
      
      // Mock feature execution tracking
      const originalExecuteJS = mockWebContents[0].executeJavaScript;
      mockWebContents[0].executeJavaScript = jest.fn(async (script) => {
        if (script.includes('localStorage')) {
          executionOrder.push('cleanup');
        }
        return originalExecuteJS(script);
      });
      
      const originalReload = mockWebContents[0].reload;
      mockWebContents[0].reload = jest.fn(() => {
        executionOrder.push('reload');
        return originalReload();
      });
      
      // Trigger high memory condition
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3900 * 1024 }) 
        },
      ]);
      
      await advanceTimersAndFlush(5000); // Cleanup
      await advanceTimersAndFlush(60000); // Reload
      
      // Higher priority features should execute first
      expect(executionOrder).toEqual(['cleanup', 'reload']);
    });
  });

  describe('Reporting and Export', () => {
    beforeEach(async () => {
      await memoryManager.enable();
    });

    it('should generate comprehensive report', async () => {
      // Run for a while to collect data
      for (let i = 0; i < 5; i++) {
        await advanceTimersAndFlush(60000);
      }
      
      const report = await memoryManager.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('interventions');
    });

    it('should export data in CSV format', async () => {
      await advanceTimersAndFlush(60000);
      
      const csv = memoryManager.exportCSV();
      
      expect(csv).toContain('timestamp');
      expect(csv).toContain('memory');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });
});