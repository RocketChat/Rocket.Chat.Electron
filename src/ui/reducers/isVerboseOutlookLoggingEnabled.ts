import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED } from '../actions';

type IsVerboseOutlookLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseOutlookLoggingEnabled: Reducer<
  boolean,
  IsVerboseOutlookLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseOutlookLoggingEnabled = state } = action.payload;
      return isVerboseOutlookLoggingEnabled;
    }

    default:
      return state;
  }
};
