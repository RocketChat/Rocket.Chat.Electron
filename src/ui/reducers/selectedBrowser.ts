import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SELECTED_BROWSER_CHANGED } from '../actions';

type SelectedBrowserAction =
  | ActionOf<typeof SETTINGS_SELECTED_BROWSER_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const selectedBrowser: Reducer<string | null, SelectedBrowserAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case SETTINGS_SELECTED_BROWSER_CHANGED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { selectedBrowser = state } = action.payload;
      return selectedBrowser;
    }

    default:
      return state;
  }
};
