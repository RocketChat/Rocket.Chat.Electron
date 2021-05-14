import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import { APP_SETTINGS_LOADED } from '../actions/appActions';
import { ROOT_WINDOW_STATE_CHANGED } from '../actions/uiActions';
import type { WindowState } from '../types/WindowState';

type RootWindowStateAction =
  | ActionOf<typeof ROOT_WINDOW_STATE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const rootWindowState: Reducer<WindowState, RootWindowStateAction> = (
  state = {
    focused: true,
    visible: true,
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: {
      x: undefined,
      y: undefined,
      width: 1000,
      height: 600,
    },
  },
  action
) => {
  switch (action.type) {
    case ROOT_WINDOW_STATE_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { rootWindowState = state } = action.payload;
      return rootWindowState;
    }

    default:
      return state;
  }
};
