import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED } from '../actions';

type IsMenuBarUnreadCountEnabledAction =
  | ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isMenuBarUnreadCountEnabled: Reducer<
  boolean,
  IsMenuBarUnreadCountEnabledAction
> = (state = true, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isMenuBarUnreadCountEnabled = state } = action.payload;
      return isMenuBarUnreadCountEnabled;
    }

    default:
      return state;
  }
};
