import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_MAIN_LOGGING_CHANGED } from '../actions';

type IsVerboseMainLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_MAIN_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseMainLoggingEnabled: Reducer<
  boolean,
  IsVerboseMainLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_MAIN_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseMainLoggingEnabled = state } = action.payload;
      return isVerboseMainLoggingEnabled;
    }

    default:
      return state;
  }
};
