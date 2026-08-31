import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';

type IsNotificationQuickReplyEnabledAction = ActionOf<
  typeof APP_SETTINGS_LOADED
>;

/**
 * Controls whether notifications are created with an inline reply field
 * (Windows toast reply box / macOS notification reply).
 *
 * Configurable via overridden-settings.json:
 * { "isNotificationQuickReplyEnabled": false }
 *
 * Defaults to true (quick reply enabled).
 */
export const isNotificationQuickReplyEnabled: Reducer<
  boolean,
  IsNotificationQuickReplyEnabledAction
> = (state = true, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { isNotificationQuickReplyEnabled = state } = action.payload;
      return isNotificationQuickReplyEnabled;
    }

    default:
      return state;
  }
};
