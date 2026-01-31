import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_IPC_LOGGING_CHANGED } from '../actions';

type IsVerboseIpcLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_IPC_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseIpcLoggingEnabled: Reducer<
  boolean,
  IsVerboseIpcLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_IPC_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseIpcLoggingEnabled = state } = action.payload;
      return isVerboseIpcLoggingEnabled;
    }

    default:
      return state;
  }
};
