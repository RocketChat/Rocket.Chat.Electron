import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED,
  SETTINGS_SET_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CHANGED,
} from '../actions';

type IsVideoCallDevtoolsAutoOpenEnabledAction =
  | ActionOf<
      typeof MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED
    >
  | ActionOf<
      typeof SETTINGS_SET_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CHANGED
    >
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isVideoCallDevtoolsAutoOpenEnabled: Reducer<
  boolean,
  IsVideoCallDevtoolsAutoOpenEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CHANGED:
    case MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isVideoCallDevtoolsAutoOpenEnabled = state } = action.payload;
      return isVideoCallDevtoolsAutoOpenEnabled;
    }

    default:
      return state;
  }
};
