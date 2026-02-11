import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED } from '../../ui/actions';

type OutlookCalendarSyncIntervalAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED>;

export const outlookCalendarSyncInterval: Reducer<
  number,
  OutlookCalendarSyncIntervalAction
> = (state = 60, action) => {
  switch (action.type) {
    case SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { outlookCalendarSyncInterval = state } = action.payload;
      return outlookCalendarSyncInterval;
    }

    default:
      return state;
  }
};
