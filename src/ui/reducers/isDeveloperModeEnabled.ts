import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED,
  SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED,
} from '../actions';

type IsDeveloperModeEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED>
  | ActionOf<typeof SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isDeveloperModeEnabled: Reducer<
  boolean,
  IsDeveloperModeEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED:
    case MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isDeveloperModeEnabled = state } = action.payload;
      return isDeveloperModeEnabled;
    }

    default:
      return state;
  }
};
