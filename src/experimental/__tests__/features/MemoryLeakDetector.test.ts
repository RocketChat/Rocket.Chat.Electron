import { app } from 'electron';
import { MemoryLeakDetector } from '../../features/MemoryLeakDetector';

jest.mock('electron', () => ({
  app: {
    getAppMetrics: jest.fn(),
  },
  webContents: {
    getAllWebContents: jest.fn().mockReturnValue([]),
  },
}));

describe('MemoryLeakDetector', () => {
  let detector: MemoryLeakDetector;
  const mockMetrics = [
    {
      pid: 1234,
      type: 'Renderer',
      memory: { workingSetSize: 100000 },
      cpu: { percentCPUUsage: 5 },
    },
    {
      pid: 5678,
      type: 'Browser',
      memory: { workingSetSize: 200000 },
      cpu: { percentCPUUsage: 10 },
    },
  ];

  beforeEach(() => {
    detector = new MemoryLeakDetector();
    (app.getAppMetrics as jest.Mock).mockReturnValue(mockMetrics);
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return the correct name', () => {
      expect(detector.getName()).toBe('MemoryLeakDetector');
    });
  });

  describe('enable/disable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start detection when enabled', async () => {
      await detector.enable();
      expect(detector.isEnabled()).toBe(true);
      
      // Should start detection interval
      jest.advanceTimersByTime(60000); // 1 minute
      expect(app.getAppMetrics).toHaveBeenCalled();
    });

    it('should stop detection when disabled', async () => {
      await detector.enable();
      await detector.disable();
      expect(detector.isEnabled()).toBe(false);
      
      // Should not call getAppMetrics after disable
      jest.advanceTimersByTime(60000);
      expect(app.getAppMetrics).toHaveBeenCalledTimes(1); // Only from enable
    });
  });

  describe('leak detection', () => {
    it('should detect steady memory growth patterns', async () => {
      // Simulate steady memory growth
      const growingMetrics = Array.from({ length: 10 }, (_, i) => [{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 100000 + (i * 50000) }, // Growing memory
        cpu: { percentCPUUsage: 5 },
      }]);

      await detector.enable();
      
      // Simulate multiple snapshots with growing memory
      for (const metrics of growingMetrics) {
        (app.getAppMetrics as jest.Mock).mockReturnValueOnce(metrics);
        await detector.detectLeaks();
      }

      const leaks = detector.getDetectedLeaks();
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0]).toHaveProperty('pid', 1234);
      expect(leaks[0]).toHaveProperty('type', 'steady-growth');
    });

    it('should detect rapid memory spikes', async () => {
      await detector.enable();
      
      // Normal memory
      (app.getAppMetrics as jest.Mock).mockReturnValueOnce([{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 100000 },
        cpu: { percentCPUUsage: 5 },
      }]);
      await detector.detectLeaks();
      
      // Sudden spike
      (app.getAppMetrics as jest.Mock).mockReturnValueOnce([{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 1000000 }, // 10x increase
        cpu: { percentCPUUsage: 5 },
      }]);
      await detector.detectLeaks();
      
      const leaks = detector.getDetectedLeaks();
      expect(leaks.some(l => l.type === 'rapid-spike')).toBe(true);
    });

    it('should not flag normal memory fluctuations as leaks', async () => {
      await detector.enable();
      
      // Simulate normal memory fluctuations
      const normalMetrics = [100000, 110000, 105000, 108000, 102000].map(size => [{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: size },
        cpu: { percentCPUUsage: 5 },
      }]);

      for (const metrics of normalMetrics) {
        (app.getAppMetrics as jest.Mock).mockReturnValueOnce(metrics);
        await detector.detectLeaks();
      }

      const leaks = detector.getDetectedLeaks();
      expect(leaks.length).toBe(0);
    });
  });

  describe('process analysis', () => {
    it('should analyze process memory correctly', () => {
      const analysis = detector.analyzeProcess({
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 500000 }, // ~500MB
        cpu: { percentCPUUsage: 5 },
      } as any);

      expect(analysis).toHaveProperty('pid', 1234);
      expect(analysis).toHaveProperty('type', 'Renderer');
      expect(analysis).toHaveProperty('memoryMB');
      expect(analysis.memoryMB).toBeCloseTo(488, 0); // ~488MB
    });

    it('should identify high memory processes', async () => {
      const highMemoryMetrics = [{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 3000000 }, // ~3GB
        cpu: { percentCPUUsage: 5 },
      }];

      (app.getAppMetrics as jest.Mock).mockReturnValue(highMemoryMetrics);
      await detector.enable();
      await detector.detectLeaks();

      const leaks = detector.getDetectedLeaks();
      expect(leaks.some(l => l.severity === 'high')).toBe(true);
    });
  });

  describe('metrics', () => {
    it('should track detection metrics', async () => {
      await detector.enable();
      await detector.detectLeaks();
      
      const metrics = detector.getMetrics();
      expect(metrics).toHaveProperty('activations');
      expect(metrics).toHaveProperty('memorySaved');
      expect(metrics).toHaveProperty('lastRun');
      expect(metrics.activations).toBeGreaterThan(0);
    });
  });

  describe('reporting', () => {
    it('should generate leak report', async () => {
      await detector.enable();
      
      // Create some leak data
      const leakMetrics = Array.from({ length: 5 }, (_, i) => [{
        pid: 1234,
        type: 'Renderer',
        memory: { workingSetSize: 100000 * (i + 1) },
        cpu: { percentCPUUsage: 5 },
      }]);

      for (const metrics of leakMetrics) {
        (app.getAppMetrics as jest.Mock).mockReturnValueOnce(metrics);
        await detector.detectLeaks();
      }

      const report = detector.generateReport();
      expect(report).toHaveProperty('detectedLeaks');
      expect(report).toHaveProperty('processAnalysis');
      expect(report).toHaveProperty('recommendations');
    });
  });
});