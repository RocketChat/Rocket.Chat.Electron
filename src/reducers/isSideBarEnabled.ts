import { Reducer } from 'redux';

import {
  MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
  PERSISTABLE_VALUES_MERGED,
  IsSideBarEnabledActionTypes,
} from '../actions';

export const isSideBarEnabled: Reducer<boolean, IsSideBarEnabledActionTypes> = (state = true, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED:
      return action.payload;

    case PERSISTABLE_VALUES_MERGED: {
      const { isSideBarEnabled = state } = action.payload;
      return isSideBarEnabled;
    }

    default:
      return state;
  }
};
