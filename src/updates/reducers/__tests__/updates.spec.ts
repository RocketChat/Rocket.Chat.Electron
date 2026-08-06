import { APP_SETTINGS_LOADED } from '../../../app/actions';
import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
} from '../../../ui/actions';
import {
  UPDATES_CHECK_FEEDBACK_DISMISSED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_DOWNLOAD_PROGRESSED,
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_PANEL_TOGGLED,
  UPDATES_READY,
  UPDATES_SKIP_REQUESTED,
  UPDATES_UPDATE_DOWNLOADED,
  UPDATE_SKIPPED,
  UPDATES_CHANNEL_CHANGED,
} from '../../actions';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatePanelOpen,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
  updateCheckStatus,
  updateDownloadProgress,
  updateDownloadStatus,
  updateError,
  updateChannel,
} from '../../reducers';

const unknown = { type: 'UNKNOWN_ACTION' } as any;

describe('doCheckForUpdatesOnStartup reducer', () => {
  it('should default to true', () => {
    expect(doCheckForUpdatesOnStartup(undefined, unknown)).toBe(true);
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      doCheckForUpdatesOnStartup(true, {
        type: UPDATES_READY,
        payload: { doCheckForUpdatesOnStartup: false },
      } as any)
    ).toBe(false);
  });

  it('should set value from ABOUT_DIALOG_TOGGLE_UPDATE_ON_START', () => {
    expect(
      doCheckForUpdatesOnStartup(true, {
        type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
        payload: false,
      } as any)
    ).toBe(false);
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      doCheckForUpdatesOnStartup(true, {
        type: APP_SETTINGS_LOADED,
        payload: { doCheckForUpdatesOnStartup: false },
      } as any)
    ).toBe(false);
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    expect(
      doCheckForUpdatesOnStartup(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });
});

describe('isCheckingForUpdates reducer', () => {
  it('should default to false', () => {
    expect(isCheckingForUpdates(undefined, unknown)).toBe(false);
  });

  it('should be true on UPDATES_CHECKING_FOR_UPDATE', () => {
    expect(
      isCheckingForUpdates(false, { type: UPDATES_CHECKING_FOR_UPDATE } as any)
    ).toBe(true);
  });

  it('should be false on UPDATES_ERROR_THROWN', () => {
    expect(
      isCheckingForUpdates(true, { type: UPDATES_ERROR_THROWN } as any)
    ).toBe(false);
  });

  it('should be false on UPDATES_NEW_VERSION_NOT_AVAILABLE', () => {
    expect(
      isCheckingForUpdates(true, {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBe(false);
  });

  it('should be false on UPDATES_NEW_VERSION_AVAILABLE', () => {
    expect(
      isCheckingForUpdates(true, {
        type: UPDATES_NEW_VERSION_AVAILABLE,
        payload: '7.0.0',
      } as any)
    ).toBe(false);
  });

  it('should preserve state on unknown action', () => {
    expect(isCheckingForUpdates(true, unknown)).toBe(true);
  });
});

describe('isEachUpdatesSettingConfigurable reducer', () => {
  it('should default to true', () => {
    expect(isEachUpdatesSettingConfigurable(undefined, unknown)).toBe(true);
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      isEachUpdatesSettingConfigurable(true, {
        type: UPDATES_READY,
        payload: { isEachUpdatesSettingConfigurable: false },
      } as any)
    ).toBe(false);
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      isEachUpdatesSettingConfigurable(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isEachUpdatesSettingConfigurable: false },
      } as any)
    ).toBe(false);
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    expect(
      isEachUpdatesSettingConfigurable(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });
});

describe('isUpdatingAllowed reducer', () => {
  it('should default to true', () => {
    expect(isUpdatingAllowed(undefined, unknown)).toBe(true);
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      isUpdatingAllowed(true, {
        type: UPDATES_READY,
        payload: { isUpdatingAllowed: false },
      } as any)
    ).toBe(false);
  });

  it('should preserve state on unknown action', () => {
    expect(isUpdatingAllowed(false, unknown)).toBe(false);
  });
});

describe('isUpdatingEnabled reducer', () => {
  it('should default to true', () => {
    expect(isUpdatingEnabled(undefined, unknown)).toBe(true);
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      isUpdatingEnabled(true, {
        type: UPDATES_READY,
        payload: { isUpdatingEnabled: false },
      } as any)
    ).toBe(false);
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      isUpdatingEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isUpdatingEnabled: false },
      } as any)
    ).toBe(false);
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    expect(
      isUpdatingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });
});

describe('newUpdateVersion reducer', () => {
  it('should default to null', () => {
    expect(newUpdateVersion(undefined, unknown)).toBeNull();
  });

  it('should set version on UPDATES_NEW_VERSION_AVAILABLE', () => {
    expect(
      newUpdateVersion(null, {
        type: UPDATES_NEW_VERSION_AVAILABLE,
        payload: '7.0.0',
      } as any)
    ).toBe('7.0.0');
  });

  it('should reset to null on UPDATES_NEW_VERSION_NOT_AVAILABLE', () => {
    expect(
      newUpdateVersion('7.0.0', {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBeNull();
  });

  it('should reset to null on UPDATE_SKIPPED', () => {
    expect(
      newUpdateVersion('7.0.0', {
        type: UPDATE_SKIPPED,
        payload: '7.0.0',
      } as any)
    ).toBeNull();
  });

  it('should preserve state on unknown action', () => {
    expect(newUpdateVersion('7.0.0', unknown)).toBe('7.0.0');
  });
});

describe('skippedUpdateVersion reducer', () => {
  it('should default to null', () => {
    expect(skippedUpdateVersion(undefined, unknown)).toBeNull();
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      skippedUpdateVersion(null, {
        type: UPDATES_READY,
        payload: { skippedUpdateVersion: '7.0.0' },
      } as any)
    ).toBe('7.0.0');
  });

  it('should set value from UPDATE_SKIPPED', () => {
    expect(
      skippedUpdateVersion(null, {
        type: UPDATE_SKIPPED,
        payload: '7.0.0',
      } as any)
    ).toBe('7.0.0');
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      skippedUpdateVersion(null, {
        type: APP_SETTINGS_LOADED,
        payload: { skippedUpdateVersion: '7.0.0' },
      } as any)
    ).toBe('7.0.0');
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    expect(
      skippedUpdateVersion('6.0.0', {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe('6.0.0');
  });
});

describe('updateError reducer', () => {
  it('should default to null', () => {
    expect(updateError(undefined, unknown)).toBeNull();
  });

  it('should reset to null on UPDATES_CHECKING_FOR_UPDATE', () => {
    expect(
      updateError(new Error('x'), {
        type: UPDATES_CHECKING_FOR_UPDATE,
      } as any)
    ).toBeNull();
  });

  it('should set the error on UPDATES_ERROR_THROWN', () => {
    const error = new Error('boom');
    expect(
      updateError(null, { type: UPDATES_ERROR_THROWN, payload: error } as any)
    ).toBe(error);
  });

  it('should reset to null on UPDATES_NEW_VERSION_NOT_AVAILABLE', () => {
    expect(
      updateError(new Error('x'), {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBeNull();
  });

  it('should reset to null on UPDATES_NEW_VERSION_AVAILABLE', () => {
    expect(
      updateError(new Error('x'), {
        type: UPDATES_NEW_VERSION_AVAILABLE,
        payload: '7.0.0',
      } as any)
    ).toBeNull();
  });

  it('should preserve state on unknown action', () => {
    const error = new Error('keep');
    expect(updateError(error, unknown)).toBe(error);
  });
});

describe('updateChannel reducer', () => {
  it("should default to 'latest'", () => {
    expect(updateChannel(undefined, unknown)).toBe('latest');
  });

  it('should set value from ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED', () => {
    expect(
      updateChannel('latest', {
        type: ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
        payload: 'beta',
      } as any)
    ).toBe('beta');
  });

  it('should set value from UPDATES_CHANNEL_CHANGED', () => {
    expect(
      updateChannel('latest', {
        type: UPDATES_CHANNEL_CHANGED,
        payload: 'alpha',
      } as any)
    ).toBe('alpha');
  });

  it('should read value from UPDATES_READY', () => {
    expect(
      updateChannel('latest', {
        type: UPDATES_READY,
        payload: { updateChannel: 'beta' },
      } as any)
    ).toBe('beta');
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      updateChannel('latest', {
        type: APP_SETTINGS_LOADED,
        payload: { updateChannel: 'alpha' },
      } as any)
    ).toBe('alpha');
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    expect(
      updateChannel('beta', { type: APP_SETTINGS_LOADED, payload: {} } as any)
    ).toBe('beta');
  });
});

describe('updateDownloadStatus reducer', () => {
  it('should default to idle', () => {
    expect(updateDownloadStatus(undefined, unknown)).toBe('idle');
  });

  it('should enter downloading when a download is requested', () => {
    expect(
      updateDownloadStatus('idle', {
        type: UPDATES_DOWNLOAD_REQUESTED,
      } as any)
    ).toBe('downloading');
  });

  it('should stay downloading while progress arrives', () => {
    expect(
      updateDownloadStatus('idle', {
        type: UPDATES_DOWNLOAD_PROGRESSED,
        payload: 42,
      } as any)
    ).toBe('downloading');
  });

  it('should become downloaded when the update is ready', () => {
    expect(
      updateDownloadStatus('downloading', {
        type: UPDATES_UPDATE_DOWNLOADED,
      } as any)
    ).toBe('downloaded');
  });

  it.each([
    UPDATES_NEW_VERSION_AVAILABLE,
    UPDATES_NEW_VERSION_NOT_AVAILABLE,
    UPDATES_ERROR_THROWN,
    UPDATE_SKIPPED,
  ])('should reset to idle on %s', (type) => {
    expect(updateDownloadStatus('downloaded', { type } as any)).toBe('idle');
  });
});

describe('updateDownloadProgress reducer', () => {
  it('should default to 0', () => {
    expect(updateDownloadProgress(undefined, unknown)).toBe(0);
  });

  it('should track the reported percentage', () => {
    expect(
      updateDownloadProgress(0, {
        type: UPDATES_DOWNLOAD_PROGRESSED,
        payload: 73,
      } as any)
    ).toBe(73);
  });

  it('should pin to 100 once downloaded', () => {
    expect(
      updateDownloadProgress(91, { type: UPDATES_UPDATE_DOWNLOADED } as any)
    ).toBe(100);
  });

  it('should restart from 0 on a fresh download request', () => {
    expect(
      updateDownloadProgress(100, { type: UPDATES_DOWNLOAD_REQUESTED } as any)
    ).toBe(0);
  });

  it('should reset to 0 when the update goes away', () => {
    expect(
      updateDownloadProgress(50, {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBe(0);
  });
});

describe('isUpdatePanelOpen reducer', () => {
  it('should default to closed', () => {
    expect(isUpdatePanelOpen(undefined, unknown)).toBe(false);
  });

  it('should follow UPDATES_PANEL_TOGGLED', () => {
    expect(
      isUpdatePanelOpen(false, {
        type: UPDATES_PANEL_TOGGLED,
        payload: true,
      } as any)
    ).toBe(true);
    expect(
      isUpdatePanelOpen(true, {
        type: UPDATES_PANEL_TOGGLED,
        payload: false,
      } as any)
    ).toBe(false);
  });

  it.each([
    UPDATES_DOWNLOAD_REQUESTED,
    UPDATES_SKIP_REQUESTED,
    UPDATES_NEW_VERSION_NOT_AVAILABLE,
    UPDATES_ERROR_THROWN,
    UPDATE_SKIPPED,
  ])('should close on %s', (type) => {
    expect(isUpdatePanelOpen(true, { type } as any)).toBe(false);
  });

  it('should stay open while the panel is merely re-rendered', () => {
    expect(isUpdatePanelOpen(true, unknown)).toBe(true);
  });
});

describe('updateCheckStatus reducer', () => {
  it('should default to idle', () => {
    expect(updateCheckStatus(undefined, unknown)).toBe('idle');
  });

  it('should enter checking when a check is requested', () => {
    expect(
      updateCheckStatus('idle', {
        type: UPDATES_CHECK_FOR_UPDATES_REQUESTED,
      } as any)
    ).toBe('checking');
  });

  it('should resolve to upToDate when a requested check finds nothing', () => {
    expect(
      updateCheckStatus('checking', {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBe('upToDate');
  });

  it('should stay idle when a startup check finds nothing', () => {
    expect(
      updateCheckStatus('idle', {
        type: UPDATES_NEW_VERSION_NOT_AVAILABLE,
      } as any)
    ).toBe('idle');
  });

  it('should resolve to failed when a requested check errors', () => {
    expect(
      updateCheckStatus('checking', {
        type: UPDATES_ERROR_THROWN,
      } as any)
    ).toBe('failed');
  });

  it('should ignore errors outside a requested check', () => {
    expect(
      updateCheckStatus('idle', {
        type: UPDATES_ERROR_THROWN,
      } as any)
    ).toBe('idle');
  });

  it('should yield to the available-update pill', () => {
    expect(
      updateCheckStatus('checking', {
        type: UPDATES_NEW_VERSION_AVAILABLE,
        payload: '4.9.0',
      } as any)
    ).toBe('idle');
  });

  it.each(['upToDate', 'failed'] as const)(
    'should dismiss %s feedback',
    (state) => {
      expect(
        updateCheckStatus(state, {
          type: UPDATES_CHECK_FEEDBACK_DISMISSED,
        } as any)
      ).toBe('idle');
    }
  );

  it('should keep showing the outcome while unrelated actions pass', () => {
    expect(updateCheckStatus('upToDate', unknown)).toBe('upToDate');
  });
});
