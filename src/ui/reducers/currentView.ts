import { APP_SETTINGS_LOADED } from '../../app/actions';
import {
  DEEP_LINKS_SERVER_ADDED,
  DEEP_LINKS_SERVER_FOCUSED,
} from '../../deepLinks/actions';
import { SERVERS_LOADED } from '../../servers/actions';
import type { ActionOf } from '../../store/actions';
import type { SIDE_BAR_SERVER_REMOVE } from '../actions';
import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  MENU_BAR_SELECT_SERVER_CLICKED,
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  TOUCH_BAR_SELECT_SERVER_TOUCHED,
  WEBVIEW_FOCUS_REQUESTED,
} from '../actions';

type CurrentViewAction =
  | ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof DEEP_LINKS_SERVER_ADDED>
  | ActionOf<typeof DEEP_LINKS_SERVER_FOCUSED>
  | ActionOf<typeof MENU_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof MENU_BAR_SELECT_SERVER_CLICKED>
  | ActionOf<typeof SERVERS_LOADED>
  | ActionOf<typeof SIDE_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_DOWNLOADS_BUTTON_CLICKED>
  | ActionOf<typeof SIDE_BAR_SETTINGS_BUTTON_CLICKED>
  | ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_SERVER_SELECTED>
  | ActionOf<typeof TOUCH_BAR_SELECT_SERVER_TOUCHED>
  | ActionOf<typeof WEBVIEW_FOCUS_REQUESTED>
  | ActionOf<typeof SIDE_BAR_SERVER_REMOVE>;

type CurrentViewState =
  | 'add-new-server'
  | 'downloads'
  | 'settings'
  | { url: string };

/**
 * Views the root window no longer has: downloads and settings each open in a
 * window of their own now.
 *
 * A profile saved before that change still names one, and restoring it would
 * strand the reader on a view whose only way out was the sidebar button that
 * now opens a window instead.
 */
const isRetiredView = (view: CurrentViewState): boolean =>
  view === 'downloads' || view === 'settings';

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

    case SERVERS_LOADED: {
      const { selected } = action.payload;
      return selected ? { url: selected } : 'add-new-server';
    }

    case APP_SETTINGS_LOADED: {
      const { currentView = state } = action.payload;
      return isRetiredView(currentView) ? state : currentView;
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

    // Downloads open in their own window now, so the root window keeps
    // whatever view it was on.
    case SIDE_BAR_DOWNLOADS_BUTTON_CLICKED:
      return state;

    // Settings open in their own window now, so the root window keeps
    // whatever view it was on.
    case SIDE_BAR_SETTINGS_BUTTON_CLICKED:
      return state;

    default:
      return state;
  }
};
