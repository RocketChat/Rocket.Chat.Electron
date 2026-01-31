import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_UPDATES_LOGGING_CHANGED } from '../actions';

type IsVerboseUpdatesLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_UPDATES_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseUpdatesLoggingEnabled: Reducer<
  boolean,
  IsVerboseUpdatesLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_UPDATES_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseUpdatesLoggingEnabled = state } = action.payload;
      return isVerboseUpdatesLoggingEnabled;
    }

    default:
      return state;
  }
};
