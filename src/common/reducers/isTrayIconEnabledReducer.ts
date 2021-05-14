import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED } from '../actions/uiActions';

type IsTrayIconEnabledAction = ActionOf<
  typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED
>;

export const isTrayIconEnabled: Reducer<boolean, IsTrayIconEnabledAction> = (
  state = process.platform !== 'linux',
  action
) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED: {
      return action.payload;
    }

    default:
      return state;
  }
};
