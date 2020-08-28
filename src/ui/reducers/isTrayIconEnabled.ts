import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED } from '../actions';

type IsTrayIconEnabledAction = (
  ActionOf<typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED>
  | ActionOf<typeof APP_SETTINGS_LOADED>
);

export const isTrayIconEnabled: Reducer<boolean, IsTrayIconEnabledAction> = (state = process.platform !== 'linux', action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED: {
      return action.payload;
    }

    case APP_SETTINGS_LOADED: {
      const { isTrayIconEnabled = state } = action.payload;
      return isTrayIconEnabled;
    }

    default:
      return state;
  }
};
