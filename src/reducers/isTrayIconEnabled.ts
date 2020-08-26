import { Reducer } from 'redux';

import {
  MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type IsTrayIconEnabledAction = (
  ActionOf<typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const isTrayIconEnabled: Reducer<boolean, IsTrayIconEnabledAction> = (state = process.platform !== 'linux', action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED: {
      return action.payload;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { isTrayIconEnabled = state } = action.payload;
      return isTrayIconEnabled;
    }

    default:
      return state;
  }
};
