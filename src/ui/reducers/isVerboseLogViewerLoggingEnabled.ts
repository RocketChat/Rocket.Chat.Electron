import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_LOGVIEWER_LOGGING_CHANGED } from '../actions';

type IsVerboseLogViewerLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_LOGVIEWER_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseLogViewerLoggingEnabled: Reducer<
  boolean,
  IsVerboseLogViewerLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_LOGVIEWER_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseLogViewerLoggingEnabled = state } = action.payload;
      return isVerboseLogViewerLoggingEnabled;
    }

    default:
      return state;
  }
};
