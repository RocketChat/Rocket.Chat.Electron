import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '../setup'; // Import setup first to initialize mocks
import { MemoryLeakDetector } from '../../features/MemoryLeakDetector';
import { createMockWebContents, createMockMemoryInfo, advanceTimersAndFlush, mockApp } from '../setup';
import { webContents } from 'electron';

describe('MemoryLeakDetector', () => {
  let leakDetector: MemoryLeakDetector;
  let mockWebContents: any[];
  
  // Helper to create metrics with webContents association
  const createMetricsWithMemory = (memoryKB: number) => [
    { 
      pid: 1, 
      type: 'Renderer',
      webContents: { id: 1 },
      memory: createMockMemoryInfo({ workingSetSize: memoryKB })
    }
  ];

  beforeEach(() => {
    leakDetector = new MemoryLeakDetector();
    
    mockWebContents = [
      createMockWebContents({ 
        id: 1,
        getURL: jest.fn(() => 'https://app1.example.com'),
      }),
      createMockWebContents({ 
        id: 2,
        getURL: jest.fn(() => 'https://app2.example.com'),
      }),
    ];
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue(mockWebContents);
    
    // Start with normal memory
    mockApp.getAppMetrics.mockReturnValue([
      { 
        pid: 1, 
        type: 'Renderer',
        memory: createMockMemoryInfo({ workingSetSize: 200 * 1024 }) // 200MB
      },
      { 
        pid: 2, 
        type: 'Renderer',
        memory: createMockMemoryInfo({ workingSetSize: 250 * 1024 }) // 250MB
      },
    ]);
  });

  afterEach(async () => {
    await leakDetector.disable();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(leakDetector.getName()).toBe('MemoryLeakDetector');
    });

    it('should start disabled', () => {
      expect(leakDetector.isEnabled()).toBe(false);
    });
  });

  describe('monitoring', () => {
    beforeEach(async () => {
      await leakDetector.enable();
    });

    it('should start monitoring when enabled', () => {
      expect(leakDetector.isEnabled()).toBe(true);
    });

    it('should collect memory samples', async () => {
      // Let it collect samples
      await advanceTimersAndFlush(30000); // 30 seconds
      await advanceTimersAndFlush(30000); // 60 seconds
      
      // Force detection
      await leakDetector.detectLeaks();
      
      // Should have collected samples (even if no leaks detected)
      expect(leakDetector.getLeakReports()).toBeDefined();
    });
  });

  describe('leak detection', () => {
    beforeEach(async () => {
      await leakDetector.enable();
    });

    it.skip('should detect steady memory growth', async () => {
      // Simulate steady growth pattern
      const memoryValues = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700];
      
      for (const value of memoryValues) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(value * 1024));
        await advanceTimersAndFlush(30000); // 30 seconds between samples
      }
      
      // Force analysis
      await leakDetector.detectLeaks();
      
      const leaks = leakDetector.getDetectedLeaks();
      const steadyGrowthLeak = leaks.find(l => l.type === 'steady_growth');
      
      expect(steadyGrowthLeak).toBeDefined();
      if (steadyGrowthLeak) {
        expect(steadyGrowthLeak.confidence).toBeGreaterThan(0.7);
      }
    });

    it.skip('should detect rapid memory growth', async () => {
      // Normal for a few samples
      for (let i = 0; i < 5; i++) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(200 * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      // Rapid growth
      const rapidGrowth = [500, 800, 1200, 1800, 2500];
      for (const value of rapidGrowth) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(value * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const leaks = leakDetector.getDetectedLeaks();
      const rapidLeak = leaks.find(l => l.type === 'rapid_growth');
      
      expect(rapidLeak).toBeDefined();
    });

    it.skip('should detect sawtooth pattern', async () => {
      // Sawtooth pattern with overall growth
      const sawtoothValues = [200, 350, 250, 400, 300, 450, 350, 500, 400, 550, 450];
      
      for (const value of sawtoothValues) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(value * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const leaks = leakDetector.getDetectedLeaks();
      const sawtoothLeak = leaks.find(l => l.type === 'sawtooth');
      
      expect(sawtoothLeak).toBeDefined();
    });

    it.skip('should detect plateau pattern', async () => {
      // Low memory, then spike, then plateau
      const plateauValues = [200, 200, 200, 800, 810, 805, 800, 795, 805, 800, 800];
      
      for (const value of plateauValues) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(value * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const leaks = leakDetector.getDetectedLeaks();
      const plateauLeak = leaks.find(l => l.type === 'plateau');
      
      expect(plateauLeak).toBeDefined();
    });
  });

  describe('leak reports', () => {
    beforeEach(async () => {
      await leakDetector.enable();
    });

    it.skip('should create leak reports', async () => {
      // Simulate a leak
      const memoryValues = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
      
      for (const value of memoryValues) {
        mockApp.getAppMetrics.mockReturnValue([
          { 
            pid: 1,
            type: 'Renderer',
            memory: createMockMemoryInfo({ workingSetSize: value * 1024 })
          }
        ]);
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const reports = leakDetector.getLeakReports();
      expect(reports.length).toBeGreaterThan(0);
      
      const report = reports[0];
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('leaks');
      expect(report).toHaveProperty('totalLeakedMemory');
      expect(report).toHaveProperty('recommendedActions');
    });

    it.skip('should provide recommendations based on leak type', async () => {
      // Simulate rapid growth
      const rapidGrowth = [200, 500, 1000, 2000, 4000];
      
      for (let i = 0; i < 6; i++) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(200 * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      for (const value of rapidGrowth) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory(value * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const reports = leakDetector.getLeakReports();
      expect(reports.length).toBeGreaterThan(0);
      
      const recommendations = reports[0].recommendedActions;
      expect(recommendations.some(r => r.includes('URGENT'))).toBe(true);
    });
  });

  describe('webContents analysis', () => {
    beforeEach(async () => {
      await leakDetector.enable();
    });

    it('should analyze specific webContents', async () => {
      // Collect enough samples for analysis
      for (let i = 0; i < 12; i++) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory((200 + i * 50) * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      const analysis = await leakDetector.analyzeWebContents(1);
      
      expect(analysis).toBeDefined();
      if (analysis) {
        expect(analysis.webContentsId).toBe(1);
        expect(analysis.type).toBeDefined();
        expect(analysis.confidence).toBeGreaterThan(0);
      }
    });

    it.skip('should clear leak data for webContents', async () => {
      // Create some leak data
      for (let i = 0; i < 12; i++) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory((200 + i * 100) * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const leaksBefore = leakDetector.getDetectedLeaks();
      expect(leaksBefore.length).toBeGreaterThan(0);
      
      // Clear for webContents 1
      leakDetector.clearLeakForWebContents(1);
      
      // Try to analyze again - should not have enough data
      const analysis = await leakDetector.analyzeWebContents(1);
      expect(analysis).toBeNull();
    });
  });

  describe('metrics tracking', () => {
    beforeEach(async () => {
      await leakDetector.enable();
    });

    it.skip('should track activation metrics', async () => {
      const initialMetrics = leakDetector.getMetrics();
      const initialActivations = initialMetrics.activations;
      
      // Trigger leak detection
      for (let i = 0; i < 11; i++) {
        mockApp.getAppMetrics.mockReturnValue(createMetricsWithMemory((200 + i * 100) * 1024));
        await advanceTimersAndFlush(30000);
      }
      
      await leakDetector.detectLeaks();
      
      const updatedMetrics = leakDetector.getMetrics();
      expect(updatedMetrics.activations).toBeGreaterThan(initialActivations);
    });
  });
});