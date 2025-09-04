import { webContents } from 'electron';
import { DOMOptimization } from '../../features/DOMOptimization';

jest.mock('electron', () => ({
  webContents: {
    getAllWebContents: jest.fn(),
  },
}));

describe('DOMOptimization', () => {
  let domOptimization: DOMOptimization;
  let mockWebContents: any;

  beforeEach(() => {
    domOptimization = new DOMOptimization();
    mockWebContents = {
      id: 1,
      isDestroyed: jest.fn().mockReturnValue(false),
      executeJavaScript: jest.fn().mockResolvedValue(undefined),
      getURL: jest.fn().mockReturnValue('https://example.com'),
    };
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([mockWebContents]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return the correct name', () => {
      expect(domOptimization.getName()).toBe('DOMOptimization');
    });
  });

  describe('enable/disable', () => {
    it('should start optimization interval when enabled', async () => {
      await domOptimization.enable();
      expect(domOptimization.isEnabled()).toBe(true);
    });

    it('should stop optimization interval when disabled', async () => {
      await domOptimization.enable();
      await domOptimization.disable();
      expect(domOptimization.isEnabled()).toBe(false);
    });
  });

  describe('applyToWebContents', () => {
    it('should inject optimization script into webContents', async () => {
      await domOptimization.enable();
      await domOptimization.applyToWebContents(mockWebContents, 'https://example.com');
      
      // Should inject the DOM optimization script
      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
      const injectedScript = mockWebContents.executeJavaScript.mock.calls[0][0];
      expect(injectedScript).toContain('DOMOptimization');
      expect(injectedScript).toContain('cleanupHiddenElements');
      expect(injectedScript).toContain('lazyLoadImages');
    });

    it('should handle errors gracefully', async () => {
      mockWebContents.executeJavaScript.mockRejectedValue(new Error('Injection failed'));
      await domOptimization.enable();
      
      // Should not throw
      await expect(domOptimization.applyToWebContents(mockWebContents, 'https://example.com'))
        .resolves.not.toThrow();
    });
  });

  describe('optimization cycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not run optimization when disabled', async () => {
      // Don't enable, just check it doesn't run
      jest.advanceTimersByTime(120000); // 2 minutes
      
      expect(mockWebContents.executeJavaScript).not.toHaveBeenCalled();
    });

    it('should skip destroyed webContents', async () => {
      mockWebContents.isDestroyed.mockReturnValue(true);
      await domOptimization.enable();
      
      jest.advanceTimersByTime(120000); // 2 minutes
      
      // Should check but not execute on destroyed webContents
      expect(mockWebContents.isDestroyed).toHaveBeenCalled();
      expect(mockWebContents.executeJavaScript).not.toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should track optimization metrics', async () => {
      await domOptimization.enable();
      await domOptimization.applyToWebContents(mockWebContents, 'https://example.com');
      
      const metrics = domOptimization.getMetrics();
      expect(metrics).toHaveProperty('activations');
      expect(metrics).toHaveProperty('memorySaved');
      expect(metrics).toHaveProperty('lastRun');
      expect(metrics.activations).toBeGreaterThan(0);
    });
  });

  describe('system sleep/resume', () => {
    it('should handle system sleep', async () => {
      await domOptimization.enable();
      await domOptimization.handleSystemSleep();
      
      // Should not throw and should still be enabled
      expect(domOptimization.isEnabled()).toBe(true);
    });

    it('should optimize after system resume', async () => {
      await domOptimization.enable();
      await domOptimization.handleSystemResume();
      
      // Should trigger optimization on all webContents
      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
    });
  });
});