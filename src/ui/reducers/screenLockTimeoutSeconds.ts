import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED } from '../actions';

export const screenLockTimeoutSeconds: Reducer<number, any> = (
  state = 0,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { screenLockTimeoutSeconds = state } = action.payload;
      return screenLockTimeoutSeconds;
    }

    default:
      return state;
  }
};
