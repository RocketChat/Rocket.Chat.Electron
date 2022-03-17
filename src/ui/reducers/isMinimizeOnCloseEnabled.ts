import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { ActionOf } from '../../store/actions';
import { SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED } from '../actions';

type isMinimizeOnCloseEnabledAction =
  | ActionOf<typeof SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isMinimizeOnCloseEnabled: Reducer<
  boolean,
  isMinimizeOnCloseEnabledAction
> = (state = process.platform === 'win32', action) => {
  switch (action.type) {
    case SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED: {
      return action.payload;
    }

    case APP_SETTINGS_LOADED: {
      const { isMinimizeOnCloseEnabled = state } = action.payload;
      return isMinimizeOnCloseEnabled;
    }

    default:
      return state;
  }
};
