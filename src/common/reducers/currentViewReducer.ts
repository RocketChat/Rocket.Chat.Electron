import type { ActionOf } from '../actions';
import {
  DEEP_LINKS_SERVER_ADDED,
  DEEP_LINKS_SERVER_FOCUSED,
} from '../actions/deepLinksActions';
import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  MENU_BAR_SELECT_SERVER_CLICKED,
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  TOUCH_BAR_SELECT_SERVER_TOUCHED,
  WEBVIEW_FOCUS_REQUESTED,
} from '../actions/uiActions';

type CurrentViewAction =
  | ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>
  | ActionOf<typeof DEEP_LINKS_SERVER_ADDED>
  | ActionOf<typeof DEEP_LINKS_SERVER_FOCUSED>
  | ActionOf<typeof MENU_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof MENU_BAR_SELECT_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_DOWNLOADS_BUTTON_CLICKED>
  | ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_SERVER_SELECTED>
  | ActionOf<typeof TOUCH_BAR_SELECT_SERVER_TOUCHED>
  | ActionOf<typeof WEBVIEW_FOCUS_REQUESTED>;

type CurrentViewState = 'add-new-server' | 'downloads' | { url: string };

export const currentView = (
  state: CurrentViewState = 'add-new-server',
  action: CurrentViewAction
): CurrentViewState => {
  switch (action.type) {
    case ADD_SERVER_VIEW_SERVER_ADDED:
    case DEEP_LINKS_SERVER_ADDED:
    case DEEP_LINKS_SERVER_FOCUSED:
    case MENU_BAR_SELECT_SERVER_CLICKED:
    case TOUCH_BAR_SELECT_SERVER_TOUCHED:
    case SIDE_BAR_SERVER_SELECTED: {
      const url = action.payload;
      return { url };
    }

    case WEBVIEW_FOCUS_REQUESTED: {
      const { url } = action.payload;
      return { url };
    }

    case MENU_BAR_ADD_NEW_SERVER_CLICKED:
    case SIDE_BAR_ADD_NEW_SERVER_CLICKED:
      return 'add-new-server';

    case SIDE_BAR_REMOVE_SERVER_CLICKED: {
      if (typeof state === 'object' && state.url === action.payload) {
        return 'add-new-server';
      }

      return state;
    }

    case SIDE_BAR_DOWNLOADS_BUTTON_CLICKED:
      return 'downloads';
  }

  return state;
};
