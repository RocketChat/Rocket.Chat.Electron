import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED } from '../actions';

type IsTrayIconUnreadCounterEnabledAction =
  | ActionOf<typeof SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isTrayIconUnreadCounterEnabled: Reducer<
  boolean,
  IsTrayIconUnreadCounterEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isTrayIconUnreadCounterEnabled = state } = action.payload;
      return isTrayIconUnreadCounterEnabled;
    }

    default:
      return state;
  }
};
