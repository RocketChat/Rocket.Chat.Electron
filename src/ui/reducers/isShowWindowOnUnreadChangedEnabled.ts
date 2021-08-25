import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED } from '../actions';

type IsShowWindowOnUnreadChangedEnabledAction =
  | ActionOf<
      typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED
    >
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isShowWindowOnUnreadChangedEnabled: Reducer<
  boolean,
  IsShowWindowOnUnreadChangedEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isShowWindowOnUnreadChangedEnabled = state } = action.payload;
      return isShowWindowOnUnreadChangedEnabled;
    }

    default:
      return state;
  }
};
