import { Reducer } from 'redux';

import {
  MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type IsShowWindowOnUnreadChangedEnabledAction = (
  ActionOf<typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const isShowWindowOnUnreadChangedEnabled: Reducer<boolean, IsShowWindowOnUnreadChangedEnabledAction> = (state = false, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED:
      return action.payload;

    case PERSISTABLE_VALUES_MERGED: {
      const { isShowWindowOnUnreadChangedEnabled = state } = action.payload;
      return isShowWindowOnUnreadChangedEnabled;
    }

    default:
      return state;
  }
};
