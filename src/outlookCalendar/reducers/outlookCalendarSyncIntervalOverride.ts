import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';

type OutlookCalendarSyncIntervalOverrideAction = ActionOf<
  typeof APP_SETTINGS_LOADED
>;

export const outlookCalendarSyncIntervalOverride: Reducer<
  number | null,
  OutlookCalendarSyncIntervalOverrideAction
> = (state = null, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { outlookCalendarSyncIntervalOverride = state } = action.payload;
      return outlookCalendarSyncIntervalOverride ?? null;
    }

    default:
      return state;
  }
};
