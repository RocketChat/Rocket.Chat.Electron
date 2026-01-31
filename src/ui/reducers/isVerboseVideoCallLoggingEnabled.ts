import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_VIDEOCALL_LOGGING_CHANGED } from '../actions';

type IsVerboseVideoCallLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_VIDEOCALL_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseVideoCallLoggingEnabled: Reducer<
  boolean,
  IsVerboseVideoCallLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_VIDEOCALL_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseVideoCallLoggingEnabled = state } = action.payload;
      return isVerboseVideoCallLoggingEnabled;
    }

    default:
      return state;
  }
};
