import { APP_SETTINGS_LOADED } from '../../actions';
import { overriddenSettingKeys } from '../overriddenSettingKeys';

describe('overriddenSettingKeys', () => {
  it('starts empty', () => {
    expect(overriddenSettingKeys(undefined, { type: '@@INIT' } as any)).toEqual(
      []
    );
  });

  it('takes the keys from the loaded settings', () => {
    expect(
      overriddenSettingKeys([], {
        type: APP_SETTINGS_LOADED,
        payload: { overriddenSettingKeys: ['isHardwareAccelerationEnabled'] },
      })
    ).toEqual(['isHardwareAccelerationEnabled']);
  });

  it('keeps the current keys when the loaded settings do not list any', () => {
    expect(
      overriddenSettingKeys(['isTransparentWindowEnabled'], {
        type: APP_SETTINGS_LOADED,
        payload: {},
      })
    ).toEqual(['isTransparentWindowEnabled']);
  });
});
