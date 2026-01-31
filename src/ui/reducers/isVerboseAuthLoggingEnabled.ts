import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_AUTH_LOGGING_CHANGED } from '../actions';

type IsVerboseAuthLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_AUTH_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseAuthLoggingEnabled: Reducer<
  boolean,
  IsVerboseAuthLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_AUTH_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseAuthLoggingEnabled = state } = action.payload;
      return isVerboseAuthLoggingEnabled;
    }

    default:
      return state;
  }
};
