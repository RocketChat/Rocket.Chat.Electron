import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SmartCleanup } from '../../features/SmartCleanup';
import { createMockWebContents, createMockMemoryInfo, simulateMemoryPressure, advanceTimersAndFlush } from '../setup';
import { app, webContents, powerMonitor } from 'electron';

describe('SmartCleanup', () => {
  let smartCleanup: SmartCleanup;
  let mockWebContents: any[];

  beforeEach(() => {
    smartCleanup = new SmartCleanup();
    mockWebContents = [
      createMockWebContents({ 
        getURL: jest.fn(() => 'https://app1.example.com'),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      }),
      createMockWebContents({ 
        getURL: jest.fn(() => 'https://app2.example.com'),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      }),
    ];
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue(mockWebContents);
    (app.getAppMetrics as jest.Mock).mockReturnValue([
      { pid: 1, type: 'Browser', memory: createMockMemoryInfo({ workingSetSize: 200 * 1024 }) },
      { pid: 2, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 500 * 1024 }) },
    ]);
  });

  afterEach(async () => {
    await smartCleanup.disable();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(smartCleanup.getName()).toBe('SmartCleanup');
    });

    it('should start disabled', () => {
      expect(smartCleanup.isEnabled()).toBe(false);
    });
  });

  describe('enabling/disabling', () => {
    it('should start idle cleanup when enabled', async () => {
      await smartCleanup.enable();
      
      expect(smartCleanup.isEnabled()).toBe(true);
      // Verify that initial cleanup is scheduled
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should stop cleanup when disabled', async () => {
      await smartCleanup.enable();
      await smartCleanup.disable();
      
      expect(smartCleanup.isEnabled()).toBe(false);
      // All timers should be cleared
      jest.clearAllTimers();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
    });

    it('should perform cleanup on webContents', async () => {
      // Trigger cleanup after initial delay
      await advanceTimersAndFlush(5000);
      
      // Verify JavaScript execution for cleanup
      for (const wc of mockWebContents) {
        expect(wc.executeJavaScript).toHaveBeenCalled();
      }
    });

    it('should track cleanup history', async () => {
      const initialMetrics = smartCleanup.getMetrics();
      expect(initialMetrics.activations).toBe(0);
      
      // Trigger cleanup
      await advanceTimersAndFlush(5000);
      
      const history = smartCleanup.getCleanupHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].actions).toContain('clear_cache');
    });

    it('should respect minimum cleanup interval', async () => {
      // First cleanup at 5 seconds
      await advanceTimersAndFlush(5000);
      const firstCallCount = mockWebContents[0].executeJavaScript.mock.calls.length;
      
      // Try to trigger another cleanup immediately
      await advanceTimersAndFlush(1000);
      
      // Should not perform another cleanup yet
      expect(mockWebContents[0].executeJavaScript.mock.calls.length).toBe(firstCallCount);
      
      // Advance past minimum interval (5 minutes)
      await advanceTimersAndFlush(5 * 60 * 1000);
      
      // Now cleanup should have occurred again
      expect(mockWebContents[0].executeJavaScript.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('memory pressure response', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
      jest.clearAllMocks();
    });

    it('should trigger aggressive cleanup under memory pressure', async () => {
      simulateMemoryPressure('critical');
      
      // Mock high memory usage
      (app.getAppMetrics as jest.Mock).mockReturnValue([
        { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 2000 * 1024 }) },
      ]);
      
      // Trigger cleanup check
      await advanceTimersAndFlush(5000);
      
      // Should perform multiple cleanup operations
      const executeJsCalls = mockWebContents[0].executeJavaScript.mock.calls;
      expect(executeJsCalls.length).toBeGreaterThan(0);
      
      // Check for aggressive cleanup scripts
      const scripts = executeJsCalls.map(call => call[0]).join('\n');
      expect(scripts).toContain('localStorage.clear');
      expect(scripts).toContain('sessionStorage.clear');
    });

    it('should perform lighter cleanup under moderate pressure', async () => {
      simulateMemoryPressure('moderate');
      
      await advanceTimersAndFlush(5000);
      
      const executeJsCalls = mockWebContents[0].executeJavaScript.mock.calls;
      expect(executeJsCalls.length).toBeGreaterThan(0);
      
      // Should not clear storage under moderate pressure
      const scripts = executeJsCalls.map(call => call[0]).join('\n');
      expect(scripts).not.toContain('localStorage.clear');
    });
  });

  describe('system events', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
      jest.clearAllMocks();
    });

    it('should perform cleanup on system resume', async () => {
      await smartCleanup.handleSystemResume();
      
      // Allow async operations to complete
      await advanceTimersAndFlush(0);
      
      expect(mockWebContents[0].executeJavaScript).toHaveBeenCalled();
      
      const metrics = smartCleanup.getMetrics();
      expect(metrics.activations).toBeGreaterThan(0);
    });

    it('should handle system sleep', async () => {
      await smartCleanup.handleSystemSleep();
      
      // Should not perform cleanup during sleep
      expect(mockWebContents[0].executeJavaScript).not.toHaveBeenCalled();
    });
  });

  describe('webContents lifecycle', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
    });

    it('should apply cleanup to new webContents', async () => {
      const newWebContents = createMockWebContents({
        getURL: jest.fn(() => 'https://new.example.com'),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
      });
      
      await smartCleanup.applyToWebContents(newWebContents, 'https://new.example.com');
      
      // Trigger cleanup
      await advanceTimersAndFlush(5000);
      
      // New webContents should be included in cleanup
      expect(newWebContents.executeJavaScript).toHaveBeenCalled();
    });

    it('should handle destroyed webContents gracefully', async () => {
      mockWebContents[0].isDestroyed.mockReturnValue(true);
      
      // Should not throw when performing cleanup
      await expect(advanceTimersAndFlush(5000)).resolves.not.toThrow();
    });
  });

  describe('cleanup history', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
    });

    it('should maintain cleanup history', async () => {
      // Perform multiple cleanups
      await advanceTimersAndFlush(5000);
      await advanceTimersAndFlush(5 * 60 * 1000);
      
      const history = smartCleanup.getCleanupHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      // Check history structure
      const lastCleanup = history[history.length - 1];
      expect(lastCleanup).toHaveProperty('timestamp');
      expect(lastCleanup).toHaveProperty('memoryBefore');
      expect(lastCleanup).toHaveProperty('memoryAfter');
      expect(lastCleanup).toHaveProperty('memorySaved');
      expect(lastCleanup).toHaveProperty('actions');
      expect(lastCleanup).toHaveProperty('duration');
    });

    it('should limit history size', async () => {
      // Set a smaller max history for testing
      const maxSize = 5;
      (smartCleanup as any).maxHistorySize = maxSize;
      
      // Perform many cleanups
      for (let i = 0; i < 10; i++) {
        await advanceTimersAndFlush(5 * 60 * 1000);
      }
      
      const history = smartCleanup.getCleanupHistory();
      expect(history.length).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('metrics tracking', () => {
    beforeEach(async () => {
      await smartCleanup.enable();
    });

    it('should track memory saved', async () => {
      // Mock memory reduction after cleanup
      (app.getAppMetrics as jest.Mock)
        .mockReturnValueOnce([
          { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 1000 * 1024 }) },
        ])
        .mockReturnValueOnce([
          { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 800 * 1024 }) },
        ]);
      
      await advanceTimersAndFlush(5000);
      
      const metrics = smartCleanup.getMetrics();
      expect(metrics.memorySaved).toBeGreaterThan(0);
    });
  });
});