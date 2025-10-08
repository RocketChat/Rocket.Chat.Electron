import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED, APP_IS_SCREEN_LOCKED_SET } from '../actions';

export const isScreenLocked: Reducer<boolean, any> = (
  state = false,
  action
) => {
  switch (action.type) {
    case APP_IS_SCREEN_LOCKED_SET:
      return Boolean(action.payload);
    case APP_SETTINGS_LOADED: {
      const { isScreenLocked = state } = action.payload || {};
      return Boolean(isScreenLocked);
    }
    default:
      return state;
  }
};
