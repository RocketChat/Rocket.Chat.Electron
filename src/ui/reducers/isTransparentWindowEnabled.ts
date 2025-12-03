import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED } from '../actions';

type IsTransparentWindowEnabledAction =
  | ActionOf<typeof SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isTransparentWindowEnabled: Reducer<
  boolean,
  IsTransparentWindowEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED: {
      const { payload } = action;
      if (typeof payload === 'boolean') {
        return payload;
      }
      console.warn(
        `Invalid payload type for ${SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED}: expected boolean, got ${typeof payload}`
      );
      return state;
    }

    case APP_SETTINGS_LOADED: {
      const { isTransparentWindowEnabled = state } = action.payload;
      return isTransparentWindowEnabled;
    }

    default:
      return state;
  }
};
