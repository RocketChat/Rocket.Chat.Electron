import { EventEmitter } from 'events';

import { UPDATES_INSTALL_REQUESTED } from '../actions';

describe('updates/install safety', () => {
  type Listener = (...args: any[]) => unknown;

  const originalPlatform = process.platform;
  const originalWindowsStore = process.windowsStore;

  let actionListeners: Map<string, Listener>;
  let updaterListeners: Map<string, Listener>;
  let nativeAutoUpdater: EventEmitter;
  let app: EventEmitter & { exit: jest.Mock };
  let autoUpdater: Record<string, any>;
  let dispatch: jest.Mock;

  const setup = async (): Promise<void> => {
    jest.resetModules();

    jest.doMock('fs', () => ({
      promises: { readFile: jest.fn(async () => '{}') },
    }));
    jest.doMock('electron', () => ({
      app: Object.assign(app, {
        getAppPath: () => '/app',
        getPath: () => '/userData',
        getVersion: () => '4.20.0',
        isPackaged: true,
      }),
      autoUpdater: nativeAutoUpdater,
      powerMonitor: { on: jest.fn() },
    }));
    jest.doMock('electron-updater', () => ({ autoUpdater }));
    jest.doMock('../../logging/scopes', () => ({
      loggers: { updates: { info: jest.fn(), warn: jest.fn() } },
    }));
    jest.doMock('../../store', () => ({
      select: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
          isUpdatingEnabled: true,
          doCheckForUpdatesOnStartup: false,
          skippedUpdateVersion: null,
          updateChannel: 'latest',
          newUpdateVersion: null,
          updateDownloadStatus: 'idle',
        }),
      dispatch: (action: unknown) => dispatch(action),
      listen: (type: string, fn: Listener) => actionListeners.set(type, fn),
    }));
    jest.doMock('../../ui/main/dialogs', () => ({
      askUpdateInstall: jest.fn(),
      AskUpdateInstallResponse: {},
      warnAboutInstallUpdateLater: jest.fn(),
      warnAboutUpdateSkipped: jest.fn(),
    }));

    const { setupUpdates } = await import('../main');
    await setupUpdates();
  };

  const requestInstall = async (): Promise<void> => {
    await actionListeners.get(UPDATES_INSTALL_REQUESTED)?.({
      type: UPDATES_INSTALL_REQUESTED,
    });
    // installDownloadedUpdate defers the native call with setImmediate.
    await jest.advanceTimersByTimeAsync(0);
  };

  const appQuitHandler = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: false,
      configurable: true,
    });

    actionListeners = new Map();
    updaterListeners = new Map();
    nativeAutoUpdater = new EventEmitter();
    app = Object.assign(new EventEmitter(), { exit: jest.fn() });
    app.on('window-all-closed', appQuitHandler);
    autoUpdater = {
      checkForUpdates: jest.fn(async () => null),
      quitAndInstall: jest.fn(),
      addListener: (event: string, fn: Listener) =>
        updaterListeners.set(event, fn),
    };
    dispatch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: originalWindowsStore,
      configurable: true,
    });
  });

  it('detaches window-all-closed and ignores a second install request', async () => {
    await setup();
    await requestInstall();
    await requestInstall();

    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(true, true);
    expect(app.listeners('window-all-closed')).toEqual([]);
  });

  it('restores window-all-closed after a late install error and allows a new install', async () => {
    await setup();
    await requestInstall();

    updaterListeners.get('error')?.(new Error('Squirrel: code signature'));

    expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'updates/error-thrown',
        payload: expect.objectContaining({
          message: 'Squirrel: code signature',
        }),
      })
    );

    await requestInstall();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(2);
  });

  it('restores window-all-closed when quitAndInstall throws', async () => {
    autoUpdater.quitAndInstall.mockImplementation(() => {
      throw new Error('no installer');
    });
    await setup();
    await requestInstall();

    expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
  });

  it('exits the app 20 s after the install is committed', async () => {
    await setup();
    await requestInstall();

    nativeAutoUpdater.emit('before-quit-for-update');
    await jest.advanceTimersByTimeAsync(19_999);
    expect(app.exit).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(app.exit).toHaveBeenCalledWith(0);
  });

  it('cancels an armed exit watchdog when the install fails after the commit', async () => {
    await setup();
    await requestInstall();

    // Squirrel on macOS can fail after `before-quit-for-update`.
    nativeAutoUpdater.emit('before-quit-for-update');
    updaterListeners.get('error')?.(new Error('Squirrel: install failed'));
    await jest.advanceTimersByTimeAsync(60_000);

    expect(app.exit).not.toHaveBeenCalled();
  });

  it('starts the installer again after an installer that failed to start', async () => {
    // electron-updater's BaseUpdater keeps `quitAndInstallCalled` set after an
    // async installer failure, and ignores the next call.
    let installerStarts = 0;
    autoUpdater.quitAndInstallCalled = false;
    autoUpdater.quitAndInstall.mockImplementation(() => {
      if (autoUpdater.quitAndInstallCalled) {
        autoUpdater.quitAndInstallCalled = false;
        return;
      }
      autoUpdater.quitAndInstallCalled = true;
      installerStarts += 1;
    });
    await setup();
    await requestInstall();

    updaterListeners.get('error')?.(new Error('spawn UNKNOWN'));
    await requestInstall();

    expect(installerStarts).toBe(2);
  });

  it('drops a queued install when the attempt fails before it starts', async () => {
    await setup();
    await actionListeners.get(UPDATES_INSTALL_REQUESTED)?.({
      type: UPDATES_INSTALL_REQUESTED,
    });

    updaterListeners.get('error')?.(new Error('net::ERR_FAILED'));
    await jest.advanceTimersByTimeAsync(0);

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
  });

  it('arms no exit watchdog when the install fails before the commit', async () => {
    await setup();
    await requestInstall();

    updaterListeners.get('error')?.(new Error('install failed'));
    nativeAutoUpdater.emit('before-quit-for-update');
    await jest.advanceTimersByTimeAsync(60_000);

    expect(app.exit).not.toHaveBeenCalled();
  });
});
