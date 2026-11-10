import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { APP_SETTINGS_LOADED } from '../actions';

type IsPerformanceSettingsSectionEnabledAction = ActionOf<
  typeof APP_SETTINGS_LOADED
>;

/**
 * Whether the settings window lists the Performance section. Only an
 * administrator changes it, with this line in `overridden-settings.json`:
 *
 * { "isPerformanceSettingsSectionEnabled": false }
 *
 * The settings in the section keep their values when it is hidden.
 */
export const isPerformanceSettingsSectionEnabled: Reducer<
  boolean,
  IsPerformanceSettingsSectionEnabledAction
> = (state = true, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { isPerformanceSettingsSectionEnabled = state } = action.payload;
      return isPerformanceSettingsSectionEnabled;
    }

    default:
      return state;
  }
};
