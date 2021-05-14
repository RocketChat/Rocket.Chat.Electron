import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED } from '../actions/uiActions';

type IsMenuBarEnabledAction = ActionOf<
  typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED
>;

export const isMenuBarEnabled: Reducer<boolean, IsMenuBarEnabledAction> = (
  state = true,
  action
) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED: {
      return action.payload;
    }

    default:
      return state;
  }
};
