import { APP_SETTINGS_LOADED } from '../../../app/actions';
import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
} from '../../../ui/actions';
import {
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_READY,
  UPDATE_SKIPPED,
  UPDATES_CHANNEL_CHANGED,
} from '../../actions';
import {
  doCheckForUpdatesOnStartup,
  isCheckingForUpdates,
  isEachUpdatesSettingConfigurable,
  isUpdatingAllowed,
  isUpdatingEnabled,
  newUpdateVersion,
  skippedUpdateVersion,
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
