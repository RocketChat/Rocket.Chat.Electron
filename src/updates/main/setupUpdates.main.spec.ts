import fs from 'fs';

import { ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED } from '../../ui/actions';
// eslint-disable-next-line import/order
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_SKIP_REQUESTED,
} from '../actions';

const listeners = new Map<string, Function>();
const select = jest.fn();
const dispatch = jest.fn();
const autoUpdater = {
  logger: null as unknown,
  autoDownload: false,
  allowPrerelease: false,
  channel: 'latest',
  checkForUpdates: jest.fn(async () => undefined),
  checkForUpdatesAndNotify: jest.fn(async () => undefined),
  quitAndInstall: jest.fn(),
  downloadUpdate: jest.fn(async () => undefined),
  on: jest.fn(),
  once: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  updateConfigPath: '',
};

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(async () => '{}'),
  },
}));

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app'),
    getPath: jest.fn(() => '/userData'),
    isPackaged: true,
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
});
