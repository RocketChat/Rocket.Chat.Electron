import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED } from '../actions';

type IsDetailedEventsLoggingEnabledAction =
  | ActionOf<typeof SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isDetailedEventsLoggingEnabled: Reducer<
  boolean,
  IsDetailedEventsLoggingEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isDetailedEventsLoggingEnabled = state } = action.payload;
      return isDetailedEventsLoggingEnabled;
    }

    default:
      return state;
  }
};
