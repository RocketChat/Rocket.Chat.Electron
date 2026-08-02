import fs from 'fs';

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

import {
  ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
} from '../../ui/actions';
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
} from '../actions';
import { setupUpdates } from '../main';

describe('updates/setupUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
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

  it('wires autoUpdater and action listeners', async () => {
    await setupUpdates();
    // electron-updater may use on() and/or addListener()
    expect(
      (autoUpdater.on as jest.Mock).mock.calls.length +
        (autoUpdater.addListener as jest.Mock).mock.calls.length
    ).toBeGreaterThan(0);
    expect(listeners.has(UPDATES_CHECK_FOR_UPDATES_REQUESTED)).toBe(true);
    expect(listeners.has(UPDATE_DIALOG_SKIP_UPDATE_CLICKED)).toBe(true);
    expect(listeners.has(UPDATE_DIALOG_INSTALL_BUTTON_CLICKED)).toBe(true);
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
    await listeners.get(UPDATE_DIALOG_SKIP_UPDATE_CLICKED)?.({
      type: UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
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
