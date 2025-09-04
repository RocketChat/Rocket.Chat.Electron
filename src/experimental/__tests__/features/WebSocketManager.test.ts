import { webContents } from 'electron';
import { WebSocketManager } from '../../features/WebSocketManager';

jest.mock('electron', () => ({
  webContents: {
    getAllWebContents: jest.fn(),
  },
}));

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWebContents: any;

  beforeEach(() => {
    wsManager = new WebSocketManager();
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
      expect(wsManager.getName()).toBe('WebSocketManager');
    });
  });

  describe('enable/disable', () => {
    it('should start monitoring when enabled', async () => {
      await wsManager.enable();
      expect(wsManager.isEnabled()).toBe(true);
    });

    it('should stop monitoring and close connections when disabled', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      await wsManager.disable();
      
      expect(wsManager.isEnabled()).toBe(false);
      // Should close all connections on disable
      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('closeAll()')
      );
    });
  });

  describe('applyToWebContents', () => {
    it('should inject WebSocket management script', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      
      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
      const injectedScript = mockWebContents.executeJavaScript.mock.calls[0][0];
      expect(injectedScript).toContain('WebSocketManager');
      expect(injectedScript).toContain('trackConnection');
      expect(injectedScript).toContain('closeIdleConnections');
    });

    it('should handle injection errors gracefully', async () => {
      mockWebContents.executeJavaScript.mockRejectedValue(new Error('Injection failed'));
      await wsManager.enable();
      
      await expect(wsManager.applyToWebContents(mockWebContents, 'https://example.com'))
        .resolves.not.toThrow();
    });
  });

  describe('monitoring cycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should check for idle connections periodically', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      
      // Clear the initial injection call
      mockWebContents.executeJavaScript.mockClear();
      
      // Advance time to trigger monitoring
      jest.advanceTimersByTime(30000); // 30 seconds
      
      // Should check connections
      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('closeIdleConnections')
      );
    });

    it('should skip destroyed webContents', async () => {
      mockWebContents.isDestroyed.mockReturnValue(true);
      await wsManager.enable();
      
      jest.advanceTimersByTime(30000);
      
      expect(mockWebContents.isDestroyed).toHaveBeenCalled();
      expect(mockWebContents.executeJavaScript).not.toHaveBeenCalled();
    });
  });

  describe('system sleep/resume', () => {
    it('should close all connections before sleep', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      mockWebContents.executeJavaScript.mockClear();
      
      await wsManager.handleSystemSleep();
      
      // Should close all WebSocket connections
      expect(mockWebContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('closeAll()')
      );
    });

    it('should allow reconnection after resume', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      mockWebContents.executeJavaScript.mockClear();
      
      await wsManager.handleSystemResume();
      
      // Should re-inject management script to allow new connections
      expect(mockWebContents.executeJavaScript).toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should track WebSocket management metrics', async () => {
      await wsManager.enable();
      await wsManager.applyToWebContents(mockWebContents, 'https://example.com');
      
      const metrics = wsManager.getMetrics();
      expect(metrics).toHaveProperty('activations');
      expect(metrics).toHaveProperty('memorySaved');
      expect(metrics).toHaveProperty('lastRun');
      expect(metrics.activations).toBeGreaterThan(0);
    });
  });
});