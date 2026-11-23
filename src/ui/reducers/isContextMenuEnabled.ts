import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { MENU_BAR_TOGGLE_IS_CONTEXT_MENU_ENABLED_CLICKED } from '../actions';

type IsContextMenuEnabledAction =
  | ActionOf<typeof MENU_BAR_TOGGLE_IS_CONTEXT_MENU_ENABLED_CLICKED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const isContextMenuEnabled: Reducer<
  boolean,
  IsContextMenuEnabledAction
> = (state = true, action) => {
  switch (action.type) {
    case MENU_BAR_TOGGLE_IS_CONTEXT_MENU_ENABLED_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { isContextMenuEnabled = state } = action.payload;
      return isContextMenuEnabled;
    }

    default:
      return state;
  }
};
