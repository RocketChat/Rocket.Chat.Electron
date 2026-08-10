import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
} from '../actions';

type IsMenuBarEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED>
  | ActionOf<typeof SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

// macOS always uses the system menu bar (this flag is unused for visibility
// there). Windows and Linux default to auto-hide: Alt reveals the bar; the
// Settings / View → Menu bar toggle pins it permanently.
const defaultIsMenuBarEnabled = process.platform === 'darwin';

export const isMenuBarEnabled: Reducer<boolean, IsMenuBarEnabledAction> = (
  state = defaultIsMenuBarEnabled,
  action
) => {
  switch (action.type) {
    case SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED:
    case MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isMenuBarEnabled = state } = action.payload;
      return isMenuBarEnabled;
    }

    default:
      return state;
  }
};
