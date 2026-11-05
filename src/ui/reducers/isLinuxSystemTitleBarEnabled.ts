import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED } from '../actions';

type IsLinuxSystemTitleBarEnabledAction =
  | ActionOf<typeof SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

/**
 * Whether Linux uses native window-manager decorations instead of the
 * client-side chrome introduced in #3450. Off by default — the #3450 look
 * is the default. A restart is required for the change to take effect because
 * `titleBarStyle` is fixed at `BrowserWindow` creation time.
 */
export const isLinuxSystemTitleBarEnabled: Reducer<
  boolean,
  IsLinuxSystemTitleBarEnabledAction
> = (state = false, action) => {
  switch (action.type) {
    case SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED: {
      const { payload } = action;
      if (typeof payload === 'boolean') {
        return payload;
      }
      console.warn(
        `Invalid payload type for ${SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED}: expected boolean, got ${typeof payload}`
      );
      return state;
    }

    case APP_SETTINGS_LOADED: {
      const { isLinuxSystemTitleBarEnabled = state } = action.payload;
      return isLinuxSystemTitleBarEnabled;
    }

    default:
      return state;
  }
};
