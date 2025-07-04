import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import { SETTINGS_SET_WEBRTC_HIDE_LOCAL_IPS_ENABLED_CHANGED } from '../actions';

export const isWebRTCHideLocalIPsEnabled: Reducer<boolean, any> = (
  state = false,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_WEBRTC_HIDE_LOCAL_IPS_ENABLED_CHANGED:
      return action.payload as boolean;

    case APP_SETTINGS_LOADED: {
      const { isWebRTCHideLocalIPsEnabled = state } = action.payload;
      return isWebRTCHideLocalIPsEnabled;
    }

    default:
      return state;
  }
};
