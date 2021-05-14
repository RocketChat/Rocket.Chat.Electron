import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED } from '../actions/uiActions';

type IsShowWindowOnUnreadChangedEnabledAction = ActionOf<
  typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED
>;

export const isShowWindowOnUnreadChangedEnabled: Reducer<
  boolean,
  IsShowWindowOnUnreadChangedEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED:
      return action.payload;

    default:
      return state;
  }
};
