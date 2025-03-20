import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { VIDEO_CALL_WINDOW_STATE_CHANGED } from '../actions';
import type { WindowState } from '../common';

export const videoCallWindowState: Reducer<WindowState, any> = (
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
      width: 0,
      height: 0,
    },
  },
  action
) => {
  switch (action.type) {
    case VIDEO_CALL_WINDOW_STATE_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { videoCallWindowState = state } = action.payload;
      return videoCallWindowState;
    }

    default:
      return state;
  }
};
