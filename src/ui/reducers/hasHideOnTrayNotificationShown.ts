import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN } from '../actions';

export const hasHideOnTrayNotificationShown: Reducer<
  boolean,
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.hasHideOnTrayNotificationShown);
    case SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN:
      return action.payload;
    default:
      return state;
  }
};
