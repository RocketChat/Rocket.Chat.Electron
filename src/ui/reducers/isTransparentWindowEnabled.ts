import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED } from '../actions';

export const isTransparentWindowEnabled: Reducer<boolean, any> = (
  state = false,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isTransparentWindowEnabled = state } = action.payload;
      return isTransparentWindowEnabled;
    }

    default:
      return state;
  }
};
