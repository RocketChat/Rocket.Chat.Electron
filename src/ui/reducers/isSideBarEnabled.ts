import { Reducer } from 'redux';

import { PERSISTABLE_VALUES_MERGED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED } from '../actions';

type IsSideBarEnabledAction = (
  ActionOf<typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const isSideBarEnabled: Reducer<boolean, IsSideBarEnabledAction> = (state = true, action) => {
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
