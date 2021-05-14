import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED } from '../actions/uiActions';

type IsSideBarEnabledAction = ActionOf<
  typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED
>;

export const isSideBarEnabled: Reducer<boolean, IsSideBarEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED:
      return action.payload;

    default:
      return state;
  }
};
