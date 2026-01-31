import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_SERVERS_LOGGING_CHANGED } from '../actions';

type IsVerboseServersLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_SERVERS_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseServersLoggingEnabled: Reducer<
  boolean,
  IsVerboseServersLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_SERVERS_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseServersLoggingEnabled = state } = action.payload;
      return isVerboseServersLoggingEnabled;
    }

    default:
      return state;
  }
};
