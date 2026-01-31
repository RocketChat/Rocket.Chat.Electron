import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_NOTIFICATIONS_LOGGING_CHANGED } from '../actions';

type IsVerboseNotificationsLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_NOTIFICATIONS_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseNotificationsLoggingEnabled: Reducer<
  boolean,
  IsVerboseNotificationsLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_NOTIFICATIONS_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseNotificationsLoggingEnabled = state } = action.payload;
      return isVerboseNotificationsLoggingEnabled;
    }

    default:
      return state;
  }
};
