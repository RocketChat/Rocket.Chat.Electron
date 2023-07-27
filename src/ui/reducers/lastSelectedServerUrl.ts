import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SIDE_BAR_SERVER_SELECTED } from '../actions';

type LastSelectedServerUrlAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof SIDE_BAR_SERVER_SELECTED>;

export const lastSelectedServerUrl: Reducer<
  string,
  LastSelectedServerUrlAction
> = (state = '', action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { lastSelectedServerUrl = state, servers } = action.payload;
      if (state === '' && servers && servers.length > 0) {
        return servers[0].url;
      }

      return lastSelectedServerUrl;
    }

    case SIDE_BAR_SERVER_SELECTED:
      return action.payload;

    default:
      return state;
  }
};
