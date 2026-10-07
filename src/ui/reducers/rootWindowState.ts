import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { ROOT_WINDOW_STATE_CHANGED, WINDOW_BOUNDS_RESET } from '../actions';
import type { WindowState } from '../common';

type RootWindowStateAction =
  | ActionOf<typeof ROOT_WINDOW_STATE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof WINDOW_BOUNDS_RESET>;

export const DEFAULT_ROOT_WINDOW_BOUNDS: WindowState['bounds'] = {
  x: undefined,
  y: undefined,
  width: 1000,
  height: 600,
};

export const rootWindowState: Reducer<WindowState, RootWindowStateAction> = (
  state = {
    focused: true,
    visible: true,
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: DEFAULT_ROOT_WINDOW_BOUNDS,
  },
  action
) => {
  switch (action.type) {
    case ROOT_WINDOW_STATE_CHANGED:
      return action.payload;

    case WINDOW_BOUNDS_RESET:
      return {
        ...state,
        maximized: false,
        minimized: false,
        fullscreen: false,
        normal: true,
        bounds: DEFAULT_ROOT_WINDOW_BOUNDS,
      };

    case APP_SETTINGS_LOADED: {
      const { rootWindowState = state } = action.payload;
      return rootWindowState;
    }

    default:
      return state;
  }
};
