import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
} from '../actions';

type IsMenuBarEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED>
  | ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isMenuBarEnabled: Reducer<boolean, IsMenuBarEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED:
    case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isMenuBarEnabled = state } = action.payload;
      return isMenuBarEnabled;
    }

    default:
      return state;
  }
};
