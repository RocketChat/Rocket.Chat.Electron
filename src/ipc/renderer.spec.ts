import { ipcRenderer } from 'electron';
import { handle, invoke, invokeWithRetry } from './renderer';

jest.mock('electron', () => {
  const listeners = new Map<string, Function>();
  return {
    ipcRenderer: {
      on: jest.fn((channel, listener) => {
        listeners.set(channel, listener);
      }),
      removeListener: jest.fn((channel) => {
        listeners.delete(channel);
      }),
      send: jest.fn(),
      invoke: jest.fn(),
    },
  };
});

describe('ipc/renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should register on listener and call handler when triggered', async () => {
      const handler = jest.fn().mockResolvedValue('success-val');
      const cleanup = handle('server-view/get-url', handler);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        'server-view/get-url',
        expect.any(Function)
      );

      const listener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];

      await listener({}, 'unique-id');

      expect(handler).toHaveBeenCalled();
      expect(ipcRenderer.send).toHaveBeenCalledWith('server-view/get-url@unique-id', {
        resolved: 'success-val',
      });

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        'server-view/get-url',
        listener
      );
    });

    it('should catch and serialize error on failure', async () => {
      const handler = jest.fn().mockRejectedValue(new TypeError('Some type error'));
      handle('server-view/get-url', handler);

      const listener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];

      await listener({}, 'unique-id');

      expect(handler).toHaveBeenCalled();
      expect(ipcRenderer.send).toHaveBeenCalledWith('server-view/get-url@unique-id', {
        rejected: {
          name: 'TypeError',
          message: 'Some type error',
          stack: expect.any(String),
        },
      });
    });

    it('should catch and serialize string error on failure', async () => {
      const handler = jest.fn().mockRejectedValue('String error');
      handle('server-view/get-url', handler);

      const listener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];

      await listener({}, 'unique-id');

      expect(ipcRenderer.send).toHaveBeenCalledWith('server-view/get-url@unique-id', {
        rejected: {
          name: 'Error',
          message: 'String error',
        },
      });
    });
  });

  describe('invoke', () => {
    it('should call ipcRenderer.invoke with arguments', async () => {
      (ipcRenderer.invoke as jest.Mock).mockResolvedValue('value');

      const result = await invoke('server-view/get-url');

      expect(result).toBe('value');
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('server-view/get-url');
    });
  });

  describe('invokeWithRetry', () => {
    it('should resolve immediately on successful invoke', async () => {
      (ipcRenderer.invoke as jest.Mock).mockResolvedValue('success');

      const result = await invokeWithRetry('server-view/get-url', {
        maxAttempts: 3,
        retryDelay: 10,
        logRetries: false,
      });

      expect(result).toBe('success');
      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
    });

    it('should retry specified number of times and then throw', async () => {
      (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        invokeWithRetry('server-view/get-url', {
          maxAttempts: 3,
          retryDelay: 5,
          logRetries: false,
        })
      ).rejects.toThrow('Network error');

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(3);
    });

    it('should throw immediately if shouldRetry returns false', async () => {
      (ipcRenderer.invoke as jest.Mock).mockRejectedValue(new Error('Fatal error'));

      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        invokeWithRetry('server-view/get-url', {
          maxAttempts: 5,
          retryDelay: 5,
          logRetries: false,
          shouldRetry,
        })
      ).rejects.toThrow('Fatal error');

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should throw if result has success: false', async () => {
      (ipcRenderer.invoke as jest.Mock).mockResolvedValue({ success: false });

      await expect(
        invokeWithRetry('video-call-window/open-screen-picker', {
          maxAttempts: 2,
          retryDelay: 5,
          logRetries: false,
        })
      ).rejects.toThrow('IPC call failed: video-call-window/open-screen-picker returned success: false');

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
