import {
  getFailureBackoffMs,
  getNextUpdateCheckDelayMs,
  UPDATE_CHECK_INTERVAL_MS,
} from '../updateCheckSchedule';

const HOUR = 60 * 60 * 1000;

describe('updates/updateCheckSchedule', () => {
  it('checks at once when no check ran yet', () => {
    expect(
      getNextUpdateCheckDelayMs(
        { lastAttemptAt: null, consecutiveFailures: 0 },
        1_000
      )
    ).toBe(0);
  });

  it('waits 24 h after a successful check', () => {
    expect(
      getNextUpdateCheckDelayMs(
        { lastAttemptAt: 0, consecutiveFailures: 0 },
        HOUR
      )
    ).toBe(UPDATE_CHECK_INTERVAL_MS - HOUR);
  });

  it('backs off 1 h, 2 h, 4 h, then stays at 6 h after failures', () => {
    expect([1, 2, 3, 4, 10].map(getFailureBackoffMs)).toEqual([
      HOUR,
      2 * HOUR,
      4 * HOUR,
      6 * HOUR,
      6 * HOUR,
    ]);
  });

  it('is due when the wait has passed', () => {
    expect(
      getNextUpdateCheckDelayMs(
        { lastAttemptAt: 0, consecutiveFailures: 1 },
        2 * HOUR
      )
    ).toBe(0);
  });

  it('never waits longer than one full wait when the clock moves back', () => {
    expect(
      getNextUpdateCheckDelayMs(
        { lastAttemptAt: 10 * HOUR, consecutiveFailures: 1 },
        0
      )
    ).toBe(HOUR);
  });
});

describe('updates/setupUpdates automatic checks', () => {
  type Listener = (...args: any[]) => unknown;

  const originalPlatform = process.platform;
  const originalWindowsStore = process.windowsStore;

  let state: Record<string, unknown>;
  let dispatch: jest.Mock;
  let updaterListeners: Map<string, Listener>;
  let powerMonitorListeners: Map<string, Listener>;
  let appListeners: Map<string, Listener>;
  let autoUpdater: Record<string, any>;

  const setup = async (): Promise<void> => {
    jest.resetModules();

    jest.doMock('fs', () => ({
      promises: { readFile: jest.fn(async () => '{}') },
    }));
    jest.doMock('electron', () => ({
      app: {
        getAppPath: jest.fn(() => '/app'),
        getPath: jest.fn(() => '/userData'),
        getVersion: jest.fn(() => '4.20.0'),
        isPackaged: true,
        on: (event: string, fn: Listener) => appListeners.set(event, fn),
      },
      powerMonitor: {
        on: (event: string, fn: Listener) =>
          powerMonitorListeners.set(event, fn),
      },
    }));
    jest.doMock('electron-updater', () => ({ autoUpdater }));
    jest.doMock('../../store', () => ({
      select: (selector: (s: Record<string, unknown>) => unknown) =>
        selector(state),
      dispatch: (action: unknown) => dispatch(action),
      listen: jest.fn(),
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

  const flush = () => jest.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: false,
      configurable: true,
    });

    state = {
      isUpdatingEnabled: true,
      doCheckForUpdatesOnStartup: true,
      skippedUpdateVersion: null,
      updateChannel: 'latest',
      newUpdateVersion: null,
      updateDownloadStatus: 'idle',
    };
    dispatch = jest.fn();
    updaterListeners = new Map();
    powerMonitorListeners = new Map();
    appListeners = new Map();
    autoUpdater = {
      checkForUpdates: jest.fn(async () => null),
      addListener: (event: string, fn: Listener) =>
        updaterListeners.set(event, fn),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: originalWindowsStore,
      configurable: true,
    });
  });

  it('checks at startup and again every 24 h', async () => {
    await setup();
    await flush();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS - 1);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('runs no automatic check when checks on startup are off', async () => {
    state.doCheckForUpdatesOnStartup = false;
    await setup();
    await jest.advanceTimersByTimeAsync(2 * UPDATE_CHECK_INTERVAL_MS);

    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('leaves a known update alone', async () => {
    state.newUpdateVersion = '4.21.0';
    await setup();
    await jest.advanceTimersByTimeAsync(2 * UPDATE_CHECK_INTERVAL_MS);

    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('retries a failed automatic check after 1 h, silently', async () => {
    autoUpdater.checkForUpdates.mockRejectedValue(new Error('offline'));
    await setup();
    // The startup ladder: 3 attempts, 2 s and 5 s apart.
    await jest.advanceTimersByTimeAsync(7_000);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updates/new-version-not-available',
    });
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updates/error-thrown' })
    );

    await jest.advanceTimersByTimeAsync(HOUR);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(6);
  });

  it('checks on resume and focus only when a check is due', async () => {
    await setup();
    await flush();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    powerMonitorListeners.get('resume')?.();
    appListeners.get('browser-window-focus')?.();
    await flush();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    // A sleeping machine pauses timers but not the wall clock.
    jest.setSystemTime(UPDATE_CHECK_INTERVAL_MS + 1);
    powerMonitorListeners.get('resume')?.();
    await flush();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('gives up on a stalled check after 45 s and keeps its late error quiet', async () => {
    let failStalledCheck: (error: Error) => void = () => undefined;
    autoUpdater.checkForUpdates.mockReturnValue(
      new Promise((_, reject) => {
        failStalledCheck = reject;
      })
    );
    await setup();

    await jest.advanceTimersByTimeAsync(44_999);
    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'updates/new-version-not-available',
    });

    await jest.advanceTimersByTimeAsync(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updates/new-version-not-available',
    });
    // No retry: electron-updater would hand back the same hung request.
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    const lateError = new Error('net::ERR_TIMED_OUT');
    updaterListeners.get('error')?.(lateError);
    failStalledCheck(lateError);
    await flush();
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updates/error-thrown' })
    );
  });
});
