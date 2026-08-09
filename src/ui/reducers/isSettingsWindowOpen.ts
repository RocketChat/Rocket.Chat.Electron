import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_WINDOW_OPEN_STATE_CHANGED } from '../actions';

type IsSettingsWindowOpenAction =
  | ActionOf<typeof SETTINGS_WINDOW_OPEN_STATE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

/**
 * Whether the settings window was open when the app last shut down, so it can
 * be restored on the next launch.
 *
 * Only a deliberate close writes `false`; the window closing as part of quitting
 * leaves the flag alone, which is what makes the restore work at all.
 */
export const isSettingsWindowOpen: Reducer<
  boolean,
  IsSettingsWindowOpenAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_WINDOW_OPEN_STATE_CHANGED: {
      const { payload } = action;
      if (typeof payload === 'boolean') {
        return payload;
      }
      console.warn(
        `Invalid payload type for ${SETTINGS_WINDOW_OPEN_STATE_CHANGED}: expected boolean, got ${typeof payload}`
      );
      return state;
    }

    case APP_SETTINGS_LOADED: {
      const { isSettingsWindowOpen = state } = action.payload;
      return isSettingsWindowOpen;
    }

    default:
      return state;
  }
};
