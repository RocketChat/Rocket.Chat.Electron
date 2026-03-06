import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_DEBUG_LOGGING_CHANGED } from '../actions';

type IsDebugLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_DEBUG_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isDebugLoggingEnabled: Reducer<
  boolean,
  IsDebugLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_DEBUG_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isDebugLoggingEnabled = state } = action.payload;
      return isDebugLoggingEnabled;
    }

    default:
      return state;
  }
};
