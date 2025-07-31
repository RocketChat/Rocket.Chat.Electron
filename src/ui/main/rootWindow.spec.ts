/* eslint-disable @typescript-eslint/no-var-requires */
import { app } from 'electron';

jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
    addListener: jest.fn(),
    name: 'Test App',
  },
  BrowserWindow: jest.fn(),
  nativeImage: {
    createEmpty: jest.fn(),
    createFromPath: jest.fn(),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
    })),
  },
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  watch: jest.fn(() => jest.fn()),
  listen: jest.fn(() => jest.fn()),
  dispatchLocal: jest.fn(),
  dispatch: jest.fn(),
}));

jest.mock('../../app/main/dev', () => ({
  setupRootWindowReload: jest.fn(),
}));

jest.mock('./icons', () => ({
  getTrayIconPath: jest.fn(),
}));

describe('rootWindow close event handler', () => {
  let mockWindow: any;
  let mockEvent: any;
  let selectMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow = {
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn(),
      hide: jest.fn(),
      minimize: jest.fn(),
      blur: jest.fn(),
      isFullScreen: jest.fn(() => false),
      isDestroyed: jest.fn(() => false),
      setFullScreen: jest.fn(),
      once: jest.fn(),
      flashFrame: jest.fn(),
      setIcon: jest.fn(),
      setTitle: jest.fn(),
      setOverlayIcon: jest.fn(),
      autoHideMenuBar: false,
      setMenuBarVisibility: jest.fn(),
    };

    mockEvent = {
      preventDefault: jest.fn(),
    };

    selectMock = require('../../store').select;
  });

  describe('Linux platform with tray icon disabled', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
    });

    it('should call event.preventDefault() and app.quit() when tray icon is disabled', async () => {
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );

      expect(closeListenerCall).toBeDefined();

      const closeHandler = closeListenerCall[1];
      await closeHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(mockWindow.minimize).not.toHaveBeenCalled();
    });

    it('should hide window when tray icon is enabled', async () => {
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: true };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockWindow.hide).toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('macOS platform', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });
    });

    it('should always hide window on macOS regardless of tray icon setting', async () => {
      // Setup: tray icon disabled (shouldn't matter on macOS)
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockWindow.hide).toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Windows platform', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
    });

    it('should minimize window when tray icon disabled and minimize on close enabled', async () => {
      // Setup: tray icon disabled, minimize on close enabled
      selectMock.mockImplementation((selector: any) => {
        const mockState = {
          isTrayIconEnabled: false,
          isMinimizeOnCloseEnabled: true,
        };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockWindow.minimize).toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should call event.preventDefault() and quit app when tray icon disabled and minimize on close disabled', async () => {
      // Setup: tray icon disabled, minimize on close disabled
      selectMock.mockImplementation((selector: any) => {
        const mockState = {
          isTrayIconEnabled: false,
          isMinimizeOnCloseEnabled: false,
        };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
      expect(mockWindow.minimize).not.toHaveBeenCalled();
    });
  });

  describe('fullscreen handling', () => {
    it('should exit fullscreen before processing close event', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      // Setup: window in fullscreen, tray icon disabled
      mockWindow.isFullScreen.mockReturnValue(true);
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      // Mock the promise for leaving fullscreen
      mockWindow.once.mockImplementation(
        (event: string, callback: () => void) => {
          if (event === 'leave-full-screen') {
            // Simulate async fullscreen exit
            setTimeout(callback, 0);
          }
        }
      );

      await closeHandler(mockEvent);

      // Should attempt to exit fullscreen first
      expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
    });

    it('should handle destroyed window gracefully', async () => {
      // Setup: tray icon disabled
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      // Mock window that reports as destroyed
      mockWindow.isDestroyed.mockReturnValue(true);

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(mockWindow.minimize).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle state access errors gracefully', async () => {
      // Setup: selector that throws an error
      selectMock.mockImplementation(() => {
        throw new Error('State access error');
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const closeListenerCall = mockWindow.addListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      );
      const closeHandler = closeListenerCall[1];

      await closeHandler(mockEvent);

      expect(mockWindow.hide).toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
    });
  });
});
