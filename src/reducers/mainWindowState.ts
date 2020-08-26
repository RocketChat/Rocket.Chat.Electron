import { Reducer } from 'redux';

import {
  ROOT_WINDOW_STATE_CHANGED,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';
import { WindowState } from '../structs/ui';

type MainWindowStateAction = (
  ActionOf<typeof ROOT_WINDOW_STATE_CHANGED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

export const mainWindowState: Reducer<WindowState, MainWindowStateAction> = (state = {
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
}, action) => {
  switch (action.type) {
    case ROOT_WINDOW_STATE_CHANGED:
      return action.payload;

    case PERSISTABLE_VALUES_MERGED: {
      const { mainWindowState = state } = action.payload;
      return mainWindowState;
    }
  }

  return state;
};
