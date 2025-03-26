import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED } from '../actions';

export const isVideoCallWindowPersistenceEnabled: Reducer<boolean, any> = (
  state = true, // Enabled by default
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVideoCallWindowPersistenceEnabled = state } = action.payload;
      return isVideoCallWindowPersistenceEnabled;
    }

    default:
      return state;
  }
};
