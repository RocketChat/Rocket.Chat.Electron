import fs from 'fs';
import util from 'util';

import { ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED } from '../../ui/actions';
// eslint-disable-next-line import/order
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_ERROR_THROWN,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_SKIP_REQUESTED,
  UPDATES_UPDATE_DOWNLOADED,
} from '../actions';

const listeners = new Map<string, Function>();
const autoUpdaterListeners = new Map<string, (...args: unknown[]) => unknown>();
const select = jest.fn();
const dispatch = jest.fn();
const mockExecFileAsync = jest.fn();
const mockExecFile = Object.assign(
  jest.fn((...args: unknown[]) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      mockExecFileAsync(...args.slice(0, -1))
        .then((res: unknown) =>
          (callback as (...cbArgs: unknown[]) => void)(null, res)
        )
        .catch((err: unknown) =>
          (callback as (...cbArgs: unknown[]) => void)(err)
        );
    }
  }),
  { [util.promisify.custom]: mockExecFileAsync }
);
const mockUnlinkSync = jest.fn();

// Mirrors electron-updater: the constructor allows prereleases when the
// running version has a prerelease id, and the `channel` setter always
// turns `allowDowngrade` on.
const autoUpdater = {
  logger: null as unknown,
  autoDownload: false,
  allowPrerelease: true,
  allowDowngrade: false,
  _channel: null as string | null,
  get channel(): string | null {
    return this._channel;
  },
  set channel(value: string | null) {
    this._channel = value;
    this.allowDowngrade = true;
  },
  checkForUpdates: jest.fn(async () => undefined),
  checkForUpdatesAndNotify: jest.fn(async () => undefined),
  quitAndInstall: jest.fn(),
  downloadUpdate: jest.fn(async () => undefined),
  on: jest.fn((event: string, fn: (...args: unknown[]) => unknown) => {
    autoUpdaterListeners.set(event, fn);
  }),
  once: jest.fn(),
  addListener: jest.fn((event: string, fn: (...args: unknown[]) => unknown) => {
    autoUpdaterListeners.set(event, fn);
  }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  updateConfigPath: '',
};

jest.mock('child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(async () => '{}'),
  },
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
}));

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app'),
    getPath: jest.fn(() => '/userData'),
    isPackaged: true,
    listeners: jest.fn(() => []),
    removeAllListeners: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null),
  },
  autoUpdater: {
    on: jest.fn(),
  },
}));

jest.mock('electron-updater', () => ({
  autoUpdater,
}));

jest.mock('../../store', () => ({
  select: (...args: unknown[]) => select(...args),
  dispatch: (...args: unknown[]) => dispatch(...args),
  listen: (type: string, fn: Function) => {
    listeners.set(type, fn);
    return () => listeners.delete(type);
  },
}));

jest.mock('../../ui/main/dialogs', () => ({
  askUpdateInstall: jest.fn(async () => 0),
  AskUpdateInstallResponse: { INSTALL_UPDATE_AND_RESTART: 0 },
  warnAboutInstallUpdateLater: jest.fn(),
  warnAboutUpdateDownload: jest.fn(),
  warnAboutUpdateSkipped: jest.fn(),
}));

// Must stay below the `autoUpdater` const and jest.mock('electron-updater', ...)
// above: importing '../main' pulls in electron-updater, whose mock factory
// closes over `autoUpdater` — hoisting this import breaks that initialization order.
// eslint-disable-next-line import/first
import { setupUpdates } from '../main';

describe('updates/setupUpdates', () => {
  // `isUpdatingAllowed` is computed by the real loadConfiguration() selector
  // straight from process.platform/process.mas/process.windowsStore — never
  // from the mocked store state — so it varies by CI runner OS unless pinned
  // here. Force the win32-without-windowsStore branch deterministically.
  const originalPlatform = process.platform;
  const originalWindowsStore = process.windowsStore;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    autoUpdaterListeners.clear();
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: false,
      configurable: true,
    });
    select.mockImplementation((selector: any) =>
      selector({
        isUpdatingEnabled: true,
        doCheckForUpdatesOnStartup: false,
        skippedUpdateVersion: null,
        isReportEnabled: true,
        isFlashFrameEnabled: true,
        isHardwareAccelerationEnabled: true,
        isInternalVideoChatWindowEnabled: true,
        isVideoCallScreenCaptureFallbackEnabled: false,
        updateChannel: 'latest',
        isEachUpdatesSettingConfigurable: true,
        isUpdatingAllowed: true,
        newUpdateVersion: null,
      })
    );
    (fs.promises.readFile as jest.Mock).mockResolvedValue('{}');
    autoUpdater.allowPrerelease = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater._channel = null;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(process, 'windowsStore', {
      value: originalWindowsStore,
      configurable: true,
    });
  });

  it('wires autoUpdater and action listeners', async () => {
    await setupUpdates();
    // electron-updater may use on() and/or addListener()
    expect(
      (autoUpdater.on as jest.Mock).mock.calls.length +
        (autoUpdater.addListener as jest.Mock).mock.calls.length
    ).toBeGreaterThan(0);
    expect(listeners.has(UPDATES_CHECK_FOR_UPDATES_REQUESTED)).toBe(true);
    expect(listeners.has(UPDATES_SKIP_REQUESTED)).toBe(true);
    expect(listeners.has(UPDATES_INSTALL_REQUESTED)).toBe(true);
    expect(listeners.has(ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED)).toBe(true);
  });

  it('checks for updates when requested', async () => {
    await setupUpdates();
    await listeners.get(UPDATES_CHECK_FOR_UPDATES_REQUESTED)?.({
      type: UPDATES_CHECK_FOR_UPDATES_REQUESTED,
    });
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it('dispatches UPDATE_SKIPPED when skip dialog action fires', async () => {
    await setupUpdates();
    await listeners.get(UPDATES_SKIP_REQUESTED)?.({
      type: UPDATES_SKIP_REQUESTED,
      payload: '9.9.9',
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: UPDATE_SKIPPED,
        payload: '9.9.9',
      })
    );
  });

  it('loads update.json configuration files', async () => {
    await setupUpdates();
    expect(fs.promises.readFile).toHaveBeenCalled();
  });

  describe('update channel', () => {
    const withChannel = (updateChannel: string) =>
      select.mockImplementation((selector: any) =>
        selector({
          isUpdatingEnabled: true,
          doCheckForUpdatesOnStartup: false,
          skippedUpdateVersion: null,
          updateChannel,
          isEachUpdatesSettingConfigurable: true,
          isUpdatingAllowed: true,
          newUpdateVersion: null,
        })
      );

    it('turns prereleases and downgrades off on the stable channel', async () => {
      withChannel('latest');
      await setupUpdates();
      expect(autoUpdater.channel).toBe('latest');
      expect(autoUpdater.allowPrerelease).toBe(false);
      expect(autoUpdater.allowDowngrade).toBe(false);
    });

    it.each(['alpha', 'beta'])(
      'allows prereleases but no downgrades on the %s channel',
      async (channel) => {
        withChannel(channel);
        await setupUpdates();
        expect(autoUpdater.channel).toBe(channel);
        expect(autoUpdater.allowPrerelease).toBe(true);
        expect(autoUpdater.allowDowngrade).toBe(false);
      }
    );

    it('keeps the same rules when the user changes the channel', async () => {
      withChannel('alpha');
      await setupUpdates();

      await listeners.get(ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED)?.({
        type: ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
        payload: 'latest',
      });
      expect(autoUpdater.channel).toBe('latest');
      expect(autoUpdater.allowPrerelease).toBe(false);
      expect(autoUpdater.allowDowngrade).toBe(false);

      await listeners.get(ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED)?.({
        type: ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
        payload: 'beta',
      });
      expect(autoUpdater.channel).toBe('beta');
      expect(autoUpdater.allowPrerelease).toBe(true);
      expect(autoUpdater.allowDowngrade).toBe(false);
    });
  });

  describe('update signature verification', () => {
    it('verifies valid Windows signature and dispatches UPDATES_UPDATE_DOWNLOADED', async () => {
      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'Valid\r\n' });
      await setupUpdates();

      const listener = autoUpdaterListeners.get('update-downloaded');
      expect(listener).toBeDefined();

      await listener?.({ downloadedFile: 'C:\\path\\to\\installer.exe' });

      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'powershell.exe',
        expect.arrayContaining(['-NoProfile', '-NonInteractive', '-Command']),
        expect.objectContaining({
          env: expect.objectContaining({
            ROCKETCHAT_UPDATE_FILE: 'C:\\path\\to\\installer.exe',
          }),
        })
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: UPDATES_UPDATE_DOWNLOADED,
      });
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it('discards unverified installer, dispatches error, and halts install', async () => {
      mockExecFileAsync.mockResolvedValueOnce({ stdout: 'HashMismatch\r\n' });
      await setupUpdates();

      const listener = autoUpdaterListeners.get('update-downloaded');
      expect(listener).toBeDefined();

      await listener?.({ downloadedFile: 'C:\\path\\to\\tampered.exe' });

      expect(mockUnlinkSync).toHaveBeenCalledWith('C:\\path\\to\\tampered.exe');
      expect(dispatch).toHaveBeenCalledWith({
        type: UPDATES_ERROR_THROWN,
        payload: expect.objectContaining({
          message:
            'Update signature verification failed. The update has been discarded for your safety.',
        }),
      });
      expect(dispatch).not.toHaveBeenCalledWith({
        type: UPDATES_UPDATE_DOWNLOADED,
      });
    });
  });
});
