import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';

type AllowInsecureOutlookConnectionsAction = ActionOf<
  typeof APP_SETTINGS_LOADED
>;

/**
 * Controls whether to bypass SSL certificate validation for Outlook calendar connections.
 * This setting is intended for air-gapped environments where Exchange servers use
 * self-signed certificates or internal CA certificates that are not in the system trust store.
 *
 * Configurable via overridden-settings.json:
 * { "allowInsecureOutlookConnections": true }
 *
 * Defaults to false (secure connections with certificate validation).
 */
export const allowInsecureOutlookConnections: Reducer<
  boolean,
  AllowInsecureOutlookConnectionsAction
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { allowInsecureOutlookConnections = state } = action.payload;
      return allowInsecureOutlookConnections;
    }

    default:
      return state;
  }
};
