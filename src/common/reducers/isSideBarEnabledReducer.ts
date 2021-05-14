import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { APP_SETTINGS_LOADED } from '../actions/appActions';
import { MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED } from '../actions/uiActions';

type IsSideBarEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isSideBarEnabled: Reducer<boolean, IsSideBarEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isSideBarEnabled = state } = action.payload;
      return isSideBarEnabled;
    }

    default:
      return state;
  }
};
