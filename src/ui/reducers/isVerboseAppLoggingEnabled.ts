import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_APP_LOGGING_CHANGED } from '../actions';

type IsVerboseAppLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_APP_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseAppLoggingEnabled: Reducer<
  boolean,
  IsVerboseAppLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_APP_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseAppLoggingEnabled = state } = action.payload;
      return isVerboseAppLoggingEnabled;
    }

    default:
      return state;
  }
};
