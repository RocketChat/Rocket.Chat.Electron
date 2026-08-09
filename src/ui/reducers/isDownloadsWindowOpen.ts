import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { DOWNLOADS_WINDOW_OPEN_STATE_CHANGED } from '../actions';

type IsDownloadsWindowOpenAction =
  | ActionOf<typeof DOWNLOADS_WINDOW_OPEN_STATE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

/**
 * Whether the downloads window was open when the app last shut down, so it can
 * be restored on the next launch.
 *
 * Only a deliberate close writes `false`; the window closing as part of quitting
 * leaves the flag alone, which is what makes the restore work at all.
 */
export const isDownloadsWindowOpen: Reducer<
  boolean,
  IsDownloadsWindowOpenAction
> = (state = false, action) => {
  switch (action.type) {
    case DOWNLOADS_WINDOW_OPEN_STATE_CHANGED: {
      const { payload } = action;
      if (typeof payload === 'boolean') {
        return payload;
      }
      console.warn(
        `Invalid payload type for ${DOWNLOADS_WINDOW_OPEN_STATE_CHANGED}: expected boolean, got ${typeof payload}`
      );
      return state;
    }

    case APP_SETTINGS_LOADED: {
      const { isDownloadsWindowOpen = state } = action.payload;
      return isDownloadsWindowOpen;
    }

    default:
      return state;
  }
};
