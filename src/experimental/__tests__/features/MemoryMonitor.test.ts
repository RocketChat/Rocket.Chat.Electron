import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../setup'; // Import setup first to initialize mocks
import { MemoryMonitor } from '../../features/MemoryMonitor';
import { createMockMemoryInfo, advanceTimersAndFlush, mockApp } from '../setup';
import { webContents, BrowserWindow } from 'electron';

describe('MemoryMonitor', () => {
  let memoryMonitor: MemoryMonitor;
  let mockWebContents: any[];
  let mockWindows: any[];

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    
    mockWebContents = [
      { id: 1, getURL: jest.fn(() => 'https://app1.example.com'), isDestroyed: jest.fn(() => false), getType: jest.fn(() => 'webview') },
      { id: 2, getURL: jest.fn(() => 'https://app2.example.com'), isDestroyed: jest.fn(() => false), getType: jest.fn(() => 'webview') },
    ];
    
    mockWindows = [
      { id: 1, webContents: mockWebContents[0], isDestroyed: jest.fn(() => false) },
      { id: 2, webContents: mockWebContents[1], isDestroyed: jest.fn(() => false) },
    ];
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue(mockWebContents);
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue(mockWindows);
    
    mockApp.getAppMetrics.mockReturnValue([
      { pid: 1, type: 'Browser', memory: createMockMemoryInfo({ workingSetSize: 200 * 1024 }) },
      { pid: 2, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 300 * 1024 }) },
      { pid: 3, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 250 * 1024 }) },
    ]);
  });

  afterEach(async () => {
    await memoryMonitor.disable();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(memoryMonitor.getName()).toBe('MemoryMonitor');
    });

    it('should start disabled', () => {
      expect(memoryMonitor.isEnabled()).toBe(false);
    });
  });

  describe('monitoring', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should start monitoring when enabled', () => {
      expect(memoryMonitor.isEnabled()).toBe(true);
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should collect memory metrics periodically', async () => {
      const initialSnapshot = memoryMonitor.getCurrentSnapshot();
      expect(initialSnapshot.totalMemory).toBeGreaterThan(0);
      
      // Advance time to trigger monitoring
      await advanceTimersAndFlush(10000);
      
      const history = memoryMonitor.getMemoryHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should track process metrics', async () => {
      await advanceTimersAndFlush(10000);
      
      const snapshot = memoryMonitor.getCurrentSnapshot();
      expect(snapshot.processes.length).toBe(3); // Based on mock data
      expect(snapshot.processes[0]).toHaveProperty('pid');
      expect(snapshot.processes[0]).toHaveProperty('type');
      expect(snapshot.processes[0]).toHaveProperty('memory');
    });

    it('should track webContents metrics', async () => {
      await advanceTimersAndFlush(10000);
      
      const snapshot = memoryMonitor.getCurrentSnapshot();
      expect(snapshot.webContents.length).toBe(2);
      expect(snapshot.webContents[0]).toHaveProperty('url');
      expect(snapshot.webContents[0]).toHaveProperty('memory');
    });
  });

  describe('memory calculations', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should calculate total memory correctly', () => {
      const snapshot = memoryMonitor.getCurrentSnapshot();
      // 200 + 300 + 250 = 750MB
      expect(snapshot.totalMemory).toBe(750 * 1024 * 1024); // Convert to bytes
    });

    it('should calculate average memory per process', () => {
      const snapshot = memoryMonitor.getCurrentSnapshot();
      expect(snapshot.averageMemory).toBe(250 * 1024 * 1024); // 750/3 = 250MB
    });

    it('should identify peak memory usage', async () => {
      // Initial reading
      await advanceTimersAndFlush(10000);
      
      // Simulate memory spike
      mockApp.getAppMetrics.mockReturnValue([
        { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 1000 * 1024 }) },
      ]);
      await memoryMonitor.forceSnapshot();
      await advanceTimersAndFlush(10000);
      
      // Return to normal
      mockApp.getAppMetrics.mockReturnValue([
        { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 300 * 1024 }) },
      ]);
      await memoryMonitor.forceSnapshot();
      await advanceTimersAndFlush(10000);
      
      const snapshot = memoryMonitor.getCurrentSnapshot();
      expect(snapshot.peakMemory).toBeGreaterThanOrEqual(1000 * 1024 * 1024);
    });
  });

  describe('memory alerts', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should trigger alert for high memory usage', async () => {
      const alertCallback = jest.fn();
      memoryMonitor.onMemoryAlert(alertCallback);
      
      // Simulate high memory usage (3.5GB is above 3GB threshold)
      mockApp.getAppMetrics.mockReturnValue([
        { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 3500 * 1024 }) },
      ]);
      
      // Force snapshot to trigger alert check
      await memoryMonitor.forceSnapshot();
      await advanceTimersAndFlush(10000);
      
      expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'high',
        message: expect.stringContaining('memory usage'),
        currentMemory: expect.any(Number),
        threshold: expect.any(Number),
      }));
    });

    it('should trigger critical alert for very high memory', async () => {
      const alertCallback = jest.fn();
      memoryMonitor.onMemoryAlert(alertCallback);
      
      // Simulate critical memory usage (4GB is above critical threshold)
      mockApp.getAppMetrics.mockReturnValue([
        { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: 4000 * 1024 }) },
      ]);
      
      // Force snapshot to trigger alert check
      await memoryMonitor.forceSnapshot();
      await advanceTimersAndFlush(10000);
      
      expect(alertCallback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'critical',
      }));
    });
  });

  describe('memory trends', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should detect increasing memory trend', async () => {
      const readings = [100, 150, 200, 250, 300].map(mb => mb * 1024);
      
      for (const reading of readings) {
        mockApp.getAppMetrics.mockReturnValue([
          { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: reading }) },
        ]);
        await memoryMonitor.forceSnapshot();
        await advanceTimersAndFlush(1000);
      }
      
      const trend = memoryMonitor.getMemoryTrend();
      expect(trend).toBe('increasing');
    });

    it('should detect decreasing memory trend', async () => {
      const readings = [500, 450, 400, 350, 300].map(mb => mb * 1024);
      
      for (const reading of readings) {
        mockApp.getAppMetrics.mockReturnValue([
          { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: reading }) },
        ]);
        await memoryMonitor.forceSnapshot();
        await advanceTimersAndFlush(1000);
      }
      
      const trend = memoryMonitor.getMemoryTrend();
      expect(trend).toBe('decreasing');
    });

    it('should detect stable memory trend', async () => {
      const baseMemory = 300 * 1024;
      const readings = [0, 5, -5, 3, -3].map(delta => baseMemory + delta);
      
      for (const reading of readings) {
        mockApp.getAppMetrics.mockReturnValue([
          { pid: 1, type: 'Renderer', memory: createMockMemoryInfo({ workingSetSize: reading }) },
        ]);
        await advanceTimersAndFlush(10000);
      }
      
      const trend = memoryMonitor.getMemoryTrend();
      expect(trend).toBe('stable');
    });
  });

  describe('history management', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should maintain memory history', async () => {
      // Manually capture snapshots
      for (let i = 0; i < 5; i++) {
        await memoryMonitor.forceSnapshot();
        await advanceTimersAndFlush(10000);
      }
      
      const history = memoryMonitor.getHistory();
      // First snapshot is captured on enable, plus 5 manual ones = 6
      expect(history.length).toBe(6);
      
      history.forEach(snapshot => {
        expect(snapshot).toHaveProperty('timestamp');
        expect(snapshot).toHaveProperty('app');
        expect(snapshot.app).toHaveProperty('totalMemory');
        expect(snapshot).toHaveProperty('webviews');
      });
    });

    it('should limit history size', async () => {
      // Set smaller limit for testing
      (memoryMonitor as any).maxHistorySize = 10;
      
      for (let i = 0; i < 20; i++) {
        await advanceTimersAndFlush(10000);
      }
      
      const history = memoryMonitor.getMemoryHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should clear history on disable', async () => {
      // Force capture some snapshots
      await memoryMonitor.forceSnapshot();
      await advanceTimersAndFlush(10000);
      await memoryMonitor.forceSnapshot();
      
      expect(memoryMonitor.getMemoryHistory().length).toBeGreaterThan(0);
      
      await memoryMonitor.disable();
      
      // History should be cleared after disable
      const historyAfterDisable = memoryMonitor.getMemoryHistory();
      expect(historyAfterDisable.length).toBe(0);
    });
  });

  describe('export functionality', () => {
    beforeEach(async () => {
      await memoryMonitor.enable();
    });

    it('should export memory report', async () => {
      // Collect some data
      for (let i = 0; i < 3; i++) {
        await advanceTimersAndFlush(10000);
      }
      
      const report = memoryMonitor.exportReport();
      
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('samples');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('averageMemory');
      expect(report.summary).toHaveProperty('peakMemory');
      expect(report.summary).toHaveProperty('trend');
    });

    it('should export CSV data', async () => {
      // Capture initial snapshot by calling forceSnapshot
      await memoryMonitor.forceSnapshot();
      
      for (let i = 0; i < 2; i++) {
        await advanceTimersAndFlush(10000);
        await memoryMonitor.forceSnapshot();
      }
      
      const csv = memoryMonitor.exportCSV();
      
      expect(csv).toContain('timestamp');
      expect(csv).toContain('totalMemory');
      expect(csv).toContain('processCount');
      expect(csv.split('\n').length).toBeGreaterThanOrEqual(3); // Header + 2 data rows
    });
  });
});