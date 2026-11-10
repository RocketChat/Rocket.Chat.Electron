import { APP_SETTINGS_LOADED } from '../../actions';
import { isPerformanceSettingsSectionEnabled } from '../isPerformanceSettingsSectionEnabled';

describe('isPerformanceSettingsSectionEnabled', () => {
  it('starts enabled', () => {
    expect(
      isPerformanceSettingsSectionEnabled(undefined, { type: '@@INIT' } as any)
    ).toBe(true);
  });

  it('takes the value from the loaded settings', () => {
    expect(
      isPerformanceSettingsSectionEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isPerformanceSettingsSectionEnabled: false },
      })
    ).toBe(false);
  });

  it('keeps the current value when the loaded settings do not set it', () => {
    expect(
      isPerformanceSettingsSectionEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      })
    ).toBe(false);
  });
});
