import { ipcMain } from 'electron';
import type { WebContents } from 'electron';

import { invoke, handle } from './main';

jest.mock('electron', () => {
  const handlers = new Map<string, Function>();
  const listeners = new Map<string, Function>();

  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers.set(channel, handler);
      }),
      removeHandler: jest.fn((channel) => {
        handlers.delete(channel);
      }),
      on: jest.fn((channel, listener) => {
        listeners.set(channel, listener);
      }),
      removeListener: jest.fn((channel) => {
        listeners.delete(channel);
      }),
    },
  };
});

describe('ipc/main', () => {
  let mockWebContents: jest.Mocked<WebContents>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebContents = {
      isDestroyed: jest.fn().mockReturnValue(false),
      send: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
    } as unknown as jest.Mocked<WebContents>;
  });

  describe('invoke', () => {
    it('should reject if webContents is destroyed', async () => {
      mockWebContents.isDestroyed.mockReturnValue(true);

      await expect(
        invoke(mockWebContents, 'server-view/get-url')
      ).rejects.toThrow('WebContents is already destroyed.');

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('should send channel message with unique ID and resolve when listener is called', async () => {
      const invokePromise = invoke(mockWebContents, 'server-view/get-url');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'server-view/get-url',
        expect.any(String)
      );

      const [, id] = mockWebContents.send.mock.calls[0];
      const responseChannel = `server-view/get-url@${id}`;

      // Simulate renderer response
      const registeredListeners = (ipcMain.on as jest.Mock).mock.calls;
      const listenerCall = registeredListeners.find(
        ([channel]) => channel === responseChannel
      );
      expect(listenerCall).toBeDefined();

      const listener = listenerCall[1];
      listener({}, { resolved: 'https://test.com' });

      await expect(invokePromise).resolves.toBe('https://test.com');
      expect(ipcMain.removeListener).toHaveBeenCalledWith(
        responseChannel,
        listener
      );
      expect(mockWebContents.removeListener).toHaveBeenCalledWith(
        'destroyed',
        expect.any(Function)
      );
    });

    it('should reject if renderer returns rejected error', async () => {
      const invokePromise = invoke(mockWebContents, 'server-view/get-url');

      const [, id] = mockWebContents.send.mock.calls[0];
      const responseChannel = `server-view/get-url@${id}`;

      const registeredListeners = (ipcMain.on as jest.Mock).mock.calls;
      const listener = registeredListeners.find(
        ([channel]) => channel === responseChannel
      )?.[1];

      listener({}, { rejected: { name: 'TypeError', message: 'Invalid URL', stack: 'stacktrace' } });

      await expect(invokePromise).rejects.toThrow('Invalid URL');
      expect(ipcMain.removeListener).toHaveBeenCalledWith(
        responseChannel,
        listener
      );
    });

    it('should reject when webContents is destroyed while waiting', async () => {
      const invokePromise = invoke(mockWebContents, 'server-view/get-url');

      expect(mockWebContents.once).toHaveBeenCalledWith(
        'destroyed',
        expect.any(Function)
      );

      const onDestroyed = mockWebContents.once.mock.calls.find(
        ([event]) => (event as string) === 'destroyed'
      )?.[1] as any;
      expect(onDestroyed).toBeDefined();

      if (onDestroyed) {
        onDestroyed();
      }

      await expect(invokePromise).rejects.toThrow(
        'WebContents was destroyed while waiting for IPC response on server-view/get-url'
      );
      expect(ipcMain.removeListener).toHaveBeenCalled();
    });

    it('should reject and clean up if webContents.send throws', async () => {
      mockWebContents.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      await expect(
        invoke(mockWebContents, 'server-view/get-url')
      ).rejects.toThrow('Send failed');

      expect(ipcMain.removeListener).toHaveBeenCalled();
    });
  });

  describe('handle', () => {
    it('should register a handler and return cleanup function', async () => {
      const handler = jest.fn().mockResolvedValue('test-result');
      const cleanup = handle('server-view/get-url', handler);

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'server-view/get-url',
        expect.any(Function)
      );

      const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      const result = await registeredHandler({ sender: mockWebContents });

      expect(handler).toHaveBeenCalledWith(mockWebContents);
      expect(result).toBe('test-result');

      cleanup();
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('server-view/get-url');
    });
  });
});
