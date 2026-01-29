import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { UPDATES_READY } from '../../updates/actions';
import { SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED } from '../actions';

type IsVideoCallScreenCaptureFallbackEnabledAction = ActionOf<
  typeof SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED
>;

export const isVideoCallScreenCaptureFallbackEnabled: Reducer<
  boolean,
  | IsVideoCallScreenCaptureFallbackEnabledAction
  | ActionOf<typeof UPDATES_READY>
  | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = false, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return Boolean(action.payload.isVideoCallScreenCaptureFallbackEnabled);
    case UPDATES_READY: {
      const { isVideoCallScreenCaptureFallbackEnabled = state } =
        action.payload;
      return isVideoCallScreenCaptureFallbackEnabled;
    }
    case SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED:
      return action.payload;
    default:
      return state;
  }
};
