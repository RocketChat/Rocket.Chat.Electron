import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
  SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED,
} from '../actions';

type IsSideBarEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED>
  | ActionOf<typeof SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isSideBarEnabled: Reducer<boolean, IsSideBarEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED:
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
