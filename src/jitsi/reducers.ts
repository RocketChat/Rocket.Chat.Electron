import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import type { ActionOf } from '../store/actions';
import {
  JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED,
  JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED,
} from './actions';

type JitsiServerAction =
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED>
  | ActionOf<typeof JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED>;

export const allowedJitsiServers: Reducer<
  Record<string, boolean>,
  JitsiServerAction
> = (state = {}, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { allowedJitsiServers = {} } = action.payload;
      state = allowedJitsiServers;
      return state;
    }

    case JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED: {
      state = {
        ...state,
        [action.payload.jitsiServer]: action.payload.allowed,
      };
      return state;
    }

    case JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED: {
      state = {};
      return state;
    }

    default:
      return state;
  }
};
