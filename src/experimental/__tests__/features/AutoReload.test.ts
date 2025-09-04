import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AutoReload } from '../../features/AutoReload';
import { createMockWebContents, createMockMemoryInfo, advanceTimersAndFlush } from '../setup';
import { app, webContents, dialog } from 'electron';

describe('AutoReload', () => {
  let autoReload: AutoReload;
  let mockWebContents: any[];
  let mockDialog: jest.Mocked<typeof dialog>;

  beforeEach(() => {
    autoReload = new AutoReload();
    mockDialog = dialog as jest.Mocked<typeof dialog>;
    
    mockWebContents = [
      createMockWebContents({ 
        id: 1,
        getURL: jest.fn(() => 'https://app1.example.com'),
        reload: jest.fn(),
      }),
      createMockWebContents({ 
        id: 2,
        getURL: jest.fn(() => 'https://app2.example.com'),
        reload: jest.fn(),
      }),
    ];
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue(mockWebContents);
    (app.getAppMetrics as jest.Mock).mockReturnValue([
      { 
        pid: 1, 
        type: 'Renderer', 
        webContents: mockWebContents[0],
        memory: createMockMemoryInfo({ workingSetSize: 500 * 1024 }) // 500MB
      },
      { 
        pid: 2, 
        type: 'Renderer',
        webContents: mockWebContents[1], 
        memory: createMockMemoryInfo({ workingSetSize: 400 * 1024 }) // 400MB
      },
    ]);
  });

  afterEach(async () => {
    await autoReload.disable();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(autoReload.getName()).toBe('AutoReload');
    });

    it('should start disabled', () => {
      expect(autoReload.isEnabled()).toBe(false);
    });
  });

  describe('memory monitoring', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should start monitoring when enabled', () => {
      expect(autoReload.isEnabled()).toBe(true);
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should stop monitoring when disabled', async () => {
      await autoReload.disable();
      
      jest.clearAllTimers();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should track memory history for each webContents', async () => {
      // Let monitoring run for a few cycles
      await advanceTimersAndFlush(60000); // 1 minute
      await advanceTimersAndFlush(60000); // 2 minutes
      
      const stats = autoReload.getWebContentsStats();
      expect(stats.length).toBe(2);
      expect(stats[0].memoryHistory.length).toBeGreaterThan(0);
    });
  });

  describe('memory threshold detection', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should reload when memory exceeds critical threshold', async () => {
      // Mock high memory usage (3.9GB, above 3.8GB threshold)
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3.9 * 1024 * 1024 }) // 3.9GB in KB
        },
      ]);
      
      // Trigger monitoring check
      await advanceTimersAndFlush(60000);
      
      expect(mockWebContents[0].reload).toHaveBeenCalled();
      
      const history = autoReload.getReloadHistory();
      expect(history.length).toBe(1);
      expect(history[0].reason).toBe('memory_limit');
    });

    it('should not reload when memory is below threshold', async () => {
      // Mock normal memory usage (1GB)
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 1024 * 1024 }) // 1GB in KB
        },
      ]);
      
      await advanceTimersAndFlush(60000);
      
      expect(mockWebContents[0].reload).not.toHaveBeenCalled();
    });
  });

  describe('growth rate detection', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should reload when memory growth rate is too high', async () => {
      // Simulate rapid memory growth
      const baseMemory = 1024 * 1024; // 1GB in KB
      const growthPerMinute = 100 * 1024; // 100MB per minute
      
      // First reading
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: baseMemory })
        },
      ]);
      await advanceTimersAndFlush(60000);
      
      // Second reading with high growth
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: baseMemory + growthPerMinute })
        },
      ]);
      await advanceTimersAndFlush(60000);
      
      // Third reading with continued high growth
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: baseMemory + (2 * growthPerMinute) })
        },
      ]);
      await advanceTimersAndFlush(60000);
      
      // Should reload due to high growth rate
      expect(mockWebContents[0].reload).toHaveBeenCalled();
      
      const history = autoReload.getReloadHistory();
      expect(history.some(h => h.reason === 'growth_rate')).toBe(true);
    });
  });

  describe('reload constraints', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should respect minimum reload interval', async () => {
      // Mock critical memory
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3.9 * 1024 * 1024 })
        },
      ]);
      
      // First reload
      await advanceTimersAndFlush(60000);
      expect(mockWebContents[0].reload).toHaveBeenCalledTimes(1);
      
      // Try to trigger another reload immediately
      await advanceTimersAndFlush(60000);
      
      // Should not reload again (within 10 minute minimum interval)
      expect(mockWebContents[0].reload).toHaveBeenCalledTimes(1);
      
      // Advance past minimum interval
      await advanceTimersAndFlush(10 * 60 * 1000);
      
      // Now should allow another reload
      expect(mockWebContents[0].reload).toHaveBeenCalledTimes(2);
    });

    it('should not reload if webContents is loading', async () => {
      mockWebContents[0].isLoading.mockReturnValue(true);
      
      // Mock critical memory
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3.9 * 1024 * 1024 })
        },
      ]);
      
      await advanceTimersAndFlush(60000);
      
      expect(mockWebContents[0].reload).not.toHaveBeenCalled();
    });
  });

  describe('predictive reloading', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should predict and prevent crashes', async () => {
      // Simulate memory pattern leading to predicted crash
      const readings = [
        2.0 * 1024 * 1024, // 2GB
        2.5 * 1024 * 1024, // 2.5GB
        3.0 * 1024 * 1024, // 3GB
        3.4 * 1024 * 1024, // 3.4GB - approaching limit
      ];
      
      for (const reading of readings) {
        (app.getAppMetrics as jest.Mock).mockReturnValue([
          { 
            pid: 1, 
            type: 'Renderer',
            webContents: mockWebContents[0],
            memory: createMockMemoryInfo({ workingSetSize: reading })
          },
        ]);
        await advanceTimersAndFlush(60000);
      }
      
      // Should reload based on prediction
      expect(mockWebContents[0].reload).toHaveBeenCalled();
      
      const history = autoReload.getReloadHistory();
      const predictedReload = history.find(h => h.reason === 'predicted_crash');
      expect(predictedReload).toBeDefined();
      expect(predictedReload?.preventedCrash).toBe(true);
    });
  });

  describe('reload history', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should track reload events', async () => {
      // Trigger a reload
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3.9 * 1024 * 1024 })
        },
      ]);
      
      await advanceTimersAndFlush(60000);
      
      const history = autoReload.getReloadHistory();
      expect(history.length).toBe(1);
      
      const event = history[0];
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('url');
      expect(event).toHaveProperty('memoryBefore');
      expect(event).toHaveProperty('memoryAfter');
      expect(event).toHaveProperty('reason');
      expect(event).toHaveProperty('preventedCrash');
    });

    it('should limit history size', async () => {
      // Set smaller limit for testing
      (autoReload as any).maxHistorySize = 3;
      
      // Mock critical memory to trigger reloads
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { 
          pid: 1, 
          type: 'Renderer',
          webContents: mockWebContents[0],
          memory: createMockMemoryInfo({ workingSetSize: 3.9 * 1024 * 1024 })
        },
      ]);
      
      // Trigger multiple reloads
      for (let i = 0; i < 5; i++) {
        await advanceTimersAndFlush(60000);
        await advanceTimersAndFlush(11 * 60 * 1000); // Wait past minimum interval
      }
      
      const history = autoReload.getReloadHistory();
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('manual reload', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should support manual reload trigger', async () => {
      await autoReload.manualReload('https://app1.example.com');
      
      expect(mockWebContents[0].reload).toHaveBeenCalled();
      
      const history = autoReload.getReloadHistory();
      expect(history[0].reason).toBe('manual');
    });

    it('should handle manual reload for non-existent URL gracefully', async () => {
      await expect(
        autoReload.manualReload('https://nonexistent.example.com')
      ).resolves.not.toThrow();
      
      expect(mockWebContents[0].reload).not.toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await autoReload.enable();
    });

    it('should provide webContents statistics', async () => {
      // Run monitoring for a few cycles
      await advanceTimersAndFlush(60000);
      await advanceTimersAndFlush(60000);
      
      const stats = autoReload.getWebContentsStats();
      
      expect(stats).toHaveLength(2);
      expect(stats[0]).toHaveProperty('url');
      expect(stats[0]).toHaveProperty('memoryHistory');
      expect(stats[0]).toHaveProperty('reloadCount');
      expect(stats[0]).toHaveProperty('growthRate');
      expect(stats[0]).toHaveProperty('lastReload');
    });
  });
});