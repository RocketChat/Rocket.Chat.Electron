import { Reducer } from 'redux';

import {
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  PERSISTABLE_VALUES_MERGED,
  IsMenuBarEnabledActionTypes,
} from '../actions';

export const isMenuBarEnabled: Reducer<boolean, IsMenuBarEnabledActionTypes> = (state = true, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED: {
      return action.payload;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { isMenuBarEnabled = state } = action.payload;
      return isMenuBarEnabled;
    }

    default:
      return state;
  }
};
