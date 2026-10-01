/* eslint-disable @typescript-eslint/no-var-requires */
import { app, screen } from 'electron';

jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
    addListener: jest.fn(),
    name: 'Test App',
    getAppPath: jest.fn(() => '/app'),
    commandLine: { hasSwitch: jest.fn(() => false) },
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
    getAllDisplays: jest.fn(() => []),
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

  describe('new error handling', () => {
    const ORIGINAL_PLATFORM = process.platform;

    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', {
        value: ORIGINAL_PLATFORM,
        configurable: true,
      });
    });

    it('should handle destroyed window in unsubscriber without crashing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const beforeQuitCall = (app.addListener as jest.Mock).mock.calls.find(
        (call: any) => call[0] === 'before-quit'
      );
      expect(beforeQuitCall).toBeDefined();

      const beforeQuitHandler = beforeQuitCall[1];

      mockWindow.isDestroyed.mockReturnValue(true);

      expect(() => beforeQuitHandler()).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in unsubscribers during before-quit', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const beforeQuitCall = (app.addListener as jest.Mock).mock.calls.find(
        (call: any) => call[0] === 'before-quit'
      );

      const beforeQuitHandler = beforeQuitCall[1];

      mockWindow.removeAllListeners.mockImplementation(() => {
        throw new Error('Test error in removeAllListeners');
      });

      expect(() => beforeQuitHandler()).not.toThrow();

      const warnCalls = consoleWarnSpy.mock.calls;
      const errorCalls = consoleErrorSpy.mock.calls;

      const hasExpectedLog =
        warnCalls.some((call) =>
          call[0]?.includes('Unsubscriber error during quit')
        ) ||
        errorCalls.some((call) =>
          call[0]?.includes('Error during root window cleanup')
        );

      expect(hasExpectedLog).toBe(true);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should call setImmediate for deferred cleanup in unsubscriber', async () => {
      const setImmediateSpy = jest.spyOn(global, 'setImmediate');

      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');
      const getRootWindowMock = jest.fn().mockResolvedValue(mockWindow);
      require('./rootWindow').getRootWindow = getRootWindowMock;

      setupRootWindow();
      await Promise.resolve();

      const beforeQuitCall = (app.addListener as jest.Mock).mock.calls.find(
        (call: any) => call[0] === 'before-quit'
      );

      const beforeQuitHandler = beforeQuitCall[1];
      mockWindow.isDestroyed.mockReturnValue(false);

      beforeQuitHandler();

      expect(setImmediateSpy).toHaveBeenCalled();

      setImmediateSpy.mockRestore();
    });

    it('should use safeWindowOperation pattern in callbacks', () => {
      selectMock.mockImplementation((selector: any) => {
        const mockState = { isTrayIconEnabled: false };
        return selector(mockState);
      });

      const { setupRootWindow } = require('./rootWindow');

      expect(() => setupRootWindow()).not.toThrow();
    });
  });
});

describe('applyRootWindowState', () => {
  const { applyRootWindowState } = require('./rootWindow');
  const { loggers } = require('../../logging/scopes');

  const savedState = {
    focused: false,
    visible: false,
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: { x: 100, y: 100, width: 1000, height: 600 },
  };

  let mockWindow: any;
  let infoSpy: jest.SpyInstance;

  const applyWith = (isTrayIconEnabled: boolean) => {
    (require('../../store').select as jest.Mock).mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({ rootWindowState: savedState, isTrayIconEnabled })
    );
    applyRootWindowState(mockWindow);
    const [, details] = infoSpy.mock.calls.find(
      ([message]) => message === 'Root window state applied'
    );
    return JSON.parse(details);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (screen.getAllDisplays as jest.Mock).mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]);
    mockWindow = {
      isVisible: jest.fn(() => false),
      isMinimized: jest.fn(() => false),
      setBounds: jest.fn(),
      maximize: jest.fn(),
      minimize: jest.fn(),
      setFullScreen: jest.fn(),
      show: jest.fn(),
      focus: jest.fn(),
    };
    infoSpy = jest.spyOn(loggers.ui, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('logs that a saved hidden state keeps the window in the tray', () => {
    const details = applyWith(true);

    expect(mockWindow.show).not.toHaveBeenCalled();
    expect(details).toMatchObject({
      savedVisible: false,
      isTrayIconEnabled: true,
      isRecentered: false,
      bounds: { x: 100, y: 100, width: 1000, height: 600 },
      shown: false,
      isVisible: false,
    });
  });

  it('logs that the window is shown when the tray icon is disabled', () => {
    const details = applyWith(false);

    expect(mockWindow.show).toHaveBeenCalled();
    expect(details).toMatchObject({
      savedVisible: false,
      isTrayIconEnabled: false,
      shown: true,
    });
  });
});

describe('showRootWindow', () => {
  const rootWindowModule = require('./rootWindow');
  const { loggers } = require('../../logging/scopes');
  const originalGetRootWindow = rootWindowModule.getRootWindow;

  let mockWindow: any;
  let emitReadyToShow: () => void;
  let infoSpy: jest.SpyInstance;

  const launch = async () => {
    const shown = rootWindowModule.showRootWindow();
    await Promise.resolve();
    emitReadyToShow();
    await shown;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (screen.getAllDisplays as jest.Mock).mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]);
    (require('../../store').select as jest.Mock).mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          rootWindowState: {
            focused: true,
            visible: false,
            maximized: false,
            minimized: false,
            fullscreen: false,
            normal: true,
            bounds: { x: 100, y: 100, width: 1000, height: 600 },
          },
          isTrayIconEnabled: true,
        })
    );
    mockWindow = {
      webContents: { on: jest.fn() },
      loadFile: jest.fn(),
      once: jest.fn((event: string, listener: () => void) => {
        if (event === 'ready-to-show') emitReadyToShow = listener;
      }),
      addListener: jest.fn(),
      isVisible: jest.fn(() => false),
      isMinimized: jest.fn(() => false),
      isDestroyed: jest.fn(() => false),
      setBounds: jest.fn(),
      maximize: jest.fn(),
      minimize: jest.fn(),
      setFullScreen: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
    };
    rootWindowModule.getRootWindow = jest.fn().mockResolvedValue(mockWindow);
    infoSpy = jest.spyOn(loggers.ui, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    rootWindowModule.getRootWindow = originalGetRootWindow;
    infoSpy.mockRestore();
  });

  it('opens the window on launch even if it was last hidden in the tray', async () => {
    await launch();

    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.hide).not.toHaveBeenCalled();
  });

  it('keeps the window in the tray when launched with --start-hidden', async () => {
    (app.commandLine.hasSwitch as jest.Mock).mockImplementation(
      (name: string) => name === 'start-hidden'
    );

    await launch();

    expect(mockWindow.show).not.toHaveBeenCalled();
    expect(mockWindow.hide).toHaveBeenCalled();
  });
});

describe('isInsideSomeScreen', () => {
  const { isInsideSomeScreen } = require('./rootWindow');

  const setDisplays = (
    displays: {
      bounds: { x: number; y: number; width: number; height: number };
    }[]
  ) => (screen.getAllDisplays as jest.Mock).mockReturnValue(displays);

  it('returns true when the window is fully inside a display', () => {
    setDisplays([{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]);
    expect(
      isInsideSomeScreen({ x: 100, y: 100, width: 800, height: 600 })
    ).toBe(true);
  });

  it('returns true when the window is only partially visible at a screen edge', () => {
    setDisplays([{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]);
    expect(
      isInsideSomeScreen({ x: 1800, y: 1000, width: 800, height: 600 })
    ).toBe(true);
  });

  it('returns true when the window spans two displays', () => {
    setDisplays([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { bounds: { x: 1920, y: 0, width: 1920, height: 1080 } },
    ]);
    expect(
      isInsideSomeScreen({ x: 1800, y: 100, width: 400, height: 600 })
    ).toBe(true);
  });

  it('returns false when the window is entirely off every display', () => {
    setDisplays([{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]);
    expect(
      isInsideSomeScreen({ x: 3000, y: 2000, width: 800, height: 600 })
    ).toBe(false);
  });
});
