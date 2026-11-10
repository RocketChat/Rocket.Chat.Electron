import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { APP_SETTINGS_LOADED } from '../actions';

type OverriddenSettingKeysAction = ActionOf<typeof APP_SETTINGS_LOADED>;

/**
 * The settings that an administrator set in `overridden-settings.json`. The
 * override wins on every launch, so the settings window shows these settings
 * as read-only instead of a toggle that the next launch resets.
 */
export const overriddenSettingKeys: Reducer<
  string[],
  OverriddenSettingKeysAction
> = (state = [], action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { overriddenSettingKeys = state } = action.payload;
      return overriddenSettingKeys;
    }

    default:
      return state;
  }
};
