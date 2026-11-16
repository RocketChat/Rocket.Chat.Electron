import { EventEmitter } from 'events';

import { UPDATES_INSTALL_REQUESTED } from '../actions';

describe('updates/install safety', () => {
  type Listener = (...args: any[]) => unknown;

  const originalPlatform = process.platform;
  const originalWindowsStore = process.windowsStore;
  const INSTALLER = 'C:\\updater\\pending\\installer.exe';

  let actionListeners: Map<string, Listener>;
  let updaterListeners: Map<string, Listener>;
  let nativeAutoUpdater: EventEmitter;
  let app: EventEmitter & { exit: jest.Mock; quit: jest.Mock };
  let autoUpdater: Record<string, any>;
  let dispatch: jest.Mock;
  let existingFiles: Set<string>;
  let commits: number;
  let installerStarts: number;
  let installerStartError: Error | null;

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  };

  const setup = async (): Promise<void> => {
    jest.resetModules();

    jest.doMock('fs', () => ({
      promises: { readFile: jest.fn(async () => '{}') },
      existsSync: (file: string) => existingFiles.has(file),
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

  const dispatchInstallRequest = async (): Promise<void> => {
    await actionListeners.get(UPDATES_INSTALL_REQUESTED)?.({
      type: UPDATES_INSTALL_REQUESTED,
    });
  };

  // Runs the deferred install and, on Windows and Linux, the commit one tick
  // later.
  const requestInstall = async (): Promise<void> => {
    await dispatchInstallRequest();
    await jest.advanceTimersByTimeAsync(1);
  };

  const updaterError = (error: Error): unknown =>
    updaterListeners.get('error')?.(error);

  const expectErrorDispatched = (message: string): void => {
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'updates/error-thrown',
        payload: expect.objectContaining({
          message: expect.stringContaining(message),
        }),
      })
    );
  };

  const appQuitHandler = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    setPlatform('win32');
    Object.defineProperty(process, 'windowsStore', {
      value: false,
      configurable: true,
    });

    actionListeners = new Map();
    updaterListeners = new Map();
    existingFiles = new Set([INSTALLER]);
    commits = 0;
    installerStarts = 0;
    installerStartError = null;
    dispatch = jest.fn();

    nativeAutoUpdater = new EventEmitter();
    nativeAutoUpdater.on('before-quit-for-update', () => {
      commits += 1;
    });
    app = Object.assign(new EventEmitter(), {
      exit: jest.fn(),
      quit: jest.fn(),
    });
    app.on('window-all-closed', appQuitHandler);

    // electron-updater's BaseUpdater (Windows and Linux).
    autoUpdater = {
      checkForUpdates: jest.fn(async () => null),
      quitAndInstall: jest.fn(),
      quitAndInstallCalled: false,
      downloadedUpdateHelper: { file: INSTALLER },
      install: jest.fn(() => {
        if (autoUpdater.quitAndInstallCalled) {
          return false;
        }
        autoUpdater.quitAndInstallCalled = true;
        installerStarts += 1;
        const error = installerStartError;
        if (error) {
          // child_process reports a failed spawn on the next process tick.
          process.nextTick(() => updaterError(error));
        }
        return true;
      }),
      addListener: (event: string, fn: Listener) =>
        updaterListeners.set(event, fn),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    setPlatform(originalPlatform);
    Object.defineProperty(process, 'windowsStore', {
      value: originalWindowsStore,
      configurable: true,
    });
  });

  describe('on Windows and Linux', () => {
    it('starts the installer, then commits and quits one tick later', async () => {
      await setup();
      await requestInstall();

      expect(autoUpdater.install).toHaveBeenCalledWith(true, true);
      expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
      expect(commits).toBe(1);
      expect(app.quit).toHaveBeenCalledTimes(1);
      expect(app.listeners('window-all-closed')).toEqual([]);
    });

    it('ignores a second install request while one is in progress', async () => {
      await setup();
      await requestInstall();
      await requestInstall();

      expect(autoUpdater.install).toHaveBeenCalledTimes(1);
    });

    it('exits the app 20 s after the commit', async () => {
      await setup();
      await requestInstall();

      await jest.advanceTimersByTimeAsync(19_000);
      expect(app.exit).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(2_000);
      expect(app.exit).toHaveBeenCalledWith(0);
    });

    it('stays open without a commit when the installer fails to start', async () => {
      installerStartError = new Error('spawn EPERM');
      await setup();
      await requestInstall();
      await jest.advanceTimersByTimeAsync(60_000);

      // No commit: the root window teardown listens to this event.
      expect(commits).toBe(0);
      expect(app.quit).not.toHaveBeenCalled();
      expect(app.exit).not.toHaveBeenCalled();
      expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
      expectErrorDispatched('spawn EPERM');
    });

    it('starts the installer again after a start failure', async () => {
      installerStartError = new Error('spawn EPERM');
      await setup();
      await requestInstall();

      installerStartError = null;
      await requestInstall();

      expect(installerStarts).toBe(2);
      expect(commits).toBe(1);
      expect(app.quit).toHaveBeenCalledTimes(1);
    });

    it('reports an installer that the updater did not start', async () => {
      autoUpdater.install.mockReturnValueOnce(false);
      await setup();
      await requestInstall();

      expect(commits).toBe(0);
      expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
      expectErrorDispatched('did not start');
    });

    it('recovers when install() throws', async () => {
      autoUpdater.install.mockImplementationOnce(() => {
        throw new Error('no installer');
      });
      await setup();
      await requestInstall();

      expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
      expectErrorDispatched('no installer');
    });

    it('keeps the commit when a check error arrives after it', async () => {
      await setup();
      await requestInstall();

      updaterError(new Error('net::ERR_TIMED_OUT'));
      await jest.advanceTimersByTimeAsync(20_000);

      expect(app.exit).toHaveBeenCalledWith(0);
      expect(app.listeners('window-all-closed')).toEqual([]);
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'updates/error-thrown' })
      );
    });

    it('keeps a queued install when a check error arrives before it starts', async () => {
      await setup();
      await dispatchInstallRequest();

      updaterError(new Error('net::ERR_FAILED'));
      await jest.advanceTimersByTimeAsync(1);

      expect(installerStarts).toBe(1);
      expect(commits).toBe(1);
    });

    it('reports a missing installer and does not start it', async () => {
      existingFiles.clear();
      await setup();
      await requestInstall();

      expect(autoUpdater.install).not.toHaveBeenCalled();
      expect(commits).toBe(0);
      expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
      expectErrorDispatched('missing');
    });

    it('checks the raw download path, not the shell-escaped installerPath', async () => {
      setPlatform('linux');
      const file = '/tmp/Rocket Cache/pending/rocketchat.deb';
      existingFiles = new Set([file]);
      autoUpdater.downloadedUpdateHelper = { file };
      // LinuxUpdater escapes spaces for the shell.
      autoUpdater.installerPath = '/tmp/Rocket\\ Cache/pending/rocketchat.deb';
      await setup();
      await requestInstall();

      expect(autoUpdater.install).toHaveBeenCalledTimes(1);
      expect(commits).toBe(1);
    });
  });

  describe('on macOS', () => {
    beforeEach(() => {
      setPlatform('darwin');
      // MacUpdater has no install(): Squirrel installs on quitAndInstall.
      delete autoUpdater.install;
      delete autoUpdater.quitAndInstallCalled;
      delete autoUpdater.downloadedUpdateHelper;
      autoUpdater.quitAndInstall.mockImplementation(() => {
        nativeAutoUpdater.emit('before-quit-for-update');
      });
    });

    it('exits the app 20 s after Squirrel commits', async () => {
      await setup();
      await requestInstall();

      expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(true, true);
      await jest.advanceTimersByTimeAsync(20_000);
      expect(app.exit).toHaveBeenCalledWith(0);
    });

    it('cancels the exit watchdog when Squirrel fails after the commit', async () => {
      await setup();
      await requestInstall();

      nativeAutoUpdater.emit('error', new Error('Squirrel: code signature'));
      await jest.advanceTimersByTimeAsync(60_000);

      expect(app.exit).not.toHaveBeenCalled();
      expect(app.listeners('window-all-closed')).toEqual([appQuitHandler]);
      expectErrorDispatched('code signature');
      expect(nativeAutoUpdater.listenerCount('error')).toBe(0);
    });

    it('allows a new install after a Squirrel failure', async () => {
      await setup();
      await requestInstall();
      nativeAutoUpdater.emit('error', new Error('Squirrel: failed'));

      await requestInstall();
      expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(2);
    });

    it('removes the pending Squirrel install when staging fails', async () => {
      const squirrelStagedListener = jest.fn();
      nativeAutoUpdater.on('update-downloaded', squirrelStagedListener);
      // MacUpdater before Squirrel staged the bundle: install on staging.
      autoUpdater.quitAndInstall.mockImplementation(() => {
        nativeAutoUpdater.on('update-downloaded', () => {
          nativeAutoUpdater.emit('before-quit-for-update');
          app.quit();
        });
      });
      await setup();
      await requestInstall();

      nativeAutoUpdater.emit('error', new Error('Squirrel: code signature'));
      // A later download that Squirrel stages without an install request.
      nativeAutoUpdater.emit('update-downloaded');

      expect(app.quit).not.toHaveBeenCalled();
      expect(commits).toBe(0);
      expect(nativeAutoUpdater.listeners('update-downloaded')).toEqual([
        squirrelStagedListener,
      ]);
    });

    it('keeps the commit when an updater check error arrives', async () => {
      await setup();
      await requestInstall();

      updaterError(new Error('net::ERR_TIMED_OUT'));
      await jest.advanceTimersByTimeAsync(20_000);

      expect(app.exit).toHaveBeenCalledWith(0);
    });
  });
});
