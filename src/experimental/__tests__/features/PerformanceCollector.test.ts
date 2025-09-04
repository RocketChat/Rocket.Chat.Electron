import { app, webContents } from 'electron';
import { PerformanceCollector } from '../../features/PerformanceCollector';

jest.mock('electron', () => ({
  app: {
    getAppMetrics: jest.fn(),
  },
  webContents: {
    getAllWebContents: jest.fn(),
  },
}));

jest.mock('os', () => ({
  totalmem: jest.fn().mockReturnValue(16 * 1024 * 1024 * 1024), // 16GB
  freemem: jest.fn().mockReturnValue(8 * 1024 * 1024 * 1024), // 8GB
  cpus: jest.fn().mockReturnValue([
    { times: { user: 1000, nice: 0, sys: 500, idle: 8500, irq: 0 } },
    { times: { user: 1000, nice: 0, sys: 500, idle: 8500, irq: 0 } },
  ]),
}));

describe('PerformanceCollector', () => {
  let collector: PerformanceCollector;
  let mockWebContents: any;

  beforeEach(() => {
    collector = new PerformanceCollector();
    mockWebContents = {
      id: 1,
      isDestroyed: jest.fn().mockReturnValue(false),
      executeJavaScript: jest.fn().mockResolvedValue({
        renderTime: 16.5,
        domNodes: 1500,
        jsHeapUsed: 50000000,
        layoutCount: 10,
        recalcStyleCount: 20,
      }),
      getURL: jest.fn().mockReturnValue('https://example.com'),
    };
    
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([mockWebContents]);
    (app.getAppMetrics as jest.Mock).mockReturnValue([
      {
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 100000 },
        cpu: { percentCPUUsage: 5 },
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return the correct name', () => {
      expect(collector.getName()).toBe('PerformanceCollector');
    });
  });

  describe('enable/disable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start collection when enabled', async () => {
      await collector.enable();
      expect(collector.isEnabled()).toBe(true);
      
      // Should start collection interval
      jest.advanceTimersByTime(30000); // 30 seconds
      expect(app.getAppMetrics).toHaveBeenCalled();
    });

    it('should stop collection when disabled', async () => {
      await collector.enable();
      await collector.disable();
      expect(collector.isEnabled()).toBe(false);
      
      // Clear previous calls
      (app.getAppMetrics as jest.Mock).mockClear();
      
      // Should not collect after disable
      jest.advanceTimersByTime(30000);
      expect(app.getAppMetrics).not.toHaveBeenCalled();
    });
  });

  describe('metrics collection', () => {
    it('should collect CPU metrics', async () => {
      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      expect(metrics).toHaveProperty('cpu');
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('cores');
      expect(metrics.cpu.cores).toBe(2); // Mocked 2 CPUs
    });

    it('should collect memory metrics', async () => {
      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      expect(metrics).toHaveProperty('memory');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('appUsage');
      expect(metrics.memory.total).toBe(16 * 1024 * 1024 * 1024);
    });

    it('should collect process metrics', async () => {
      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      expect(metrics).toHaveProperty('processes');
      expect(metrics.processes).toHaveLength(1);
      expect(metrics.processes[0]).toHaveProperty('pid', 1234);
      expect(metrics.processes[0]).toHaveProperty('type', 'Renderer');
      expect(metrics.processes[0]).toHaveProperty('memory');
      expect(metrics.processes[0]).toHaveProperty('cpu');
    });

    it('should collect render metrics from webContents', async () => {
      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      expect(metrics).toHaveProperty('render');
      expect(metrics.render).toHaveLength(1);
      expect(metrics.render[0]).toHaveProperty('url', 'https://example.com');
      expect(metrics.render[0]).toHaveProperty('renderTime', 16.5);
      expect(metrics.render[0]).toHaveProperty('domNodes', 1500);
      expect(metrics.render[0]).toHaveProperty('jsHeapUsed', 50000000);
    });
  });

  describe('performance analysis', () => {
    it('should identify performance issues', async () => {
      // Simulate slow render performance
      mockWebContents.executeJavaScript.mockResolvedValue({
        renderTime: 100, // Slow render
        domNodes: 10000, // Many DOM nodes
        jsHeapUsed: 500000000, // High memory
        layoutCount: 100, // Many layouts
        recalcStyleCount: 200, // Many recalcs
      });

      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      const analysis = collector.analyzePerformance(metrics);
      expect(analysis).toHaveProperty('issues');
      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues.some((i: any) => i.type === 'slow-render')).toBe(true);
    });

    it('should generate recommendations', async () => {
      await collector.enable();
      const metrics = await collector.collectMetrics();
      
      const analysis = collector.analyzePerformance(metrics);
      expect(analysis).toHaveProperty('recommendations');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('history tracking', () => {
    it('should maintain metrics history', async () => {
      await collector.enable();
      
      // Collect multiple snapshots
      await collector.collectMetrics();
      await collector.collectMetrics();
      await collector.collectMetrics();
      
      const history = collector.getHistory();
      expect(history.length).toBe(3);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('cpu');
      expect(history[0]).toHaveProperty('memory');
    });

    it('should limit history size', async () => {
      await collector.enable();
      
      // Collect more than max history
      for (let i = 0; i < 65; i++) {
        await collector.collectMetrics();
      }
      
      const history = collector.getHistory();
      expect(history.length).toBe(60); // Max history size
    });
  });

  describe('reporting', () => {
    it('should generate comprehensive report', async () => {
      await collector.enable();
      
      // Collect some data
      await collector.collectMetrics();
      await collector.collectMetrics();
      
      const report = collector.generateReport();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary).toHaveProperty('avgCPU');
      expect(report.summary).toHaveProperty('avgMemory');
      expect(report.summary).toHaveProperty('peakMemory');
    });

    it('should throw error if insufficient data', async () => {
      await collector.enable();
      
      // Don't collect any metrics
      expect(() => collector.generateReport()).toThrow('Insufficient data');
    });
  });

  describe('system events', () => {
    it('should handle system sleep', async () => {
      await collector.enable();
      await collector.handleSystemSleep();
      
      // Should still be enabled
      expect(collector.isEnabled()).toBe(true);
    });

    it('should collect metrics after resume', async () => {
      await collector.enable();
      (app.getAppMetrics as jest.Mock).mockClear();
      
      await collector.handleSystemResume();
      
      // Should immediately collect metrics
      expect(app.getAppMetrics).toHaveBeenCalled();
    });
  });
});