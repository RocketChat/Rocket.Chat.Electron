import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_VERBOSE_UI_LOGGING_CHANGED } from '../actions';

type IsVerboseUiLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_VERBOSE_UI_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVerboseUiLoggingEnabled: Reducer<
  boolean,
  IsVerboseUiLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_VERBOSE_UI_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVerboseUiLoggingEnabled = state } = action.payload;
      return isVerboseUiLoggingEnabled;
    }

    default:
      return state;
  }
};
