import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  MENU_BAR_SELECT_SERVER_CLICKED,
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  TOUCH_BAR_SELECT_SERVER_TOUCHED,
  WEBVIEW_FOCUS_REQUESTED,
  PERSISTABLE_VALUES_MERGED,
  ActionOf,
} from '../actions';

type CurrentServerUrlAction = (
  ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>
  | ActionOf<typeof MENU_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof MENU_BAR_SELECT_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_ADD_NEW_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_SERVER_SELECTED>
  | ActionOf<typeof TOUCH_BAR_SELECT_SERVER_TOUCHED>
  | ActionOf<typeof WEBVIEW_FOCUS_REQUESTED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
);

type CurrentServerUrlState = string | null;

export const currentServerUrl = (state: CurrentServerUrlState = null, action: CurrentServerUrlAction): CurrentServerUrlState => {
  switch (action.type) {
    case ADD_SERVER_VIEW_SERVER_ADDED: {
      const url = action.payload;
      return url;
    }

    case MENU_BAR_ADD_NEW_SERVER_CLICKED:
      return null;

    case MENU_BAR_SELECT_SERVER_CLICKED: {
      const url = action.payload;
      return url;
    }

    case TOUCH_BAR_SELECT_SERVER_TOUCHED:
      return action.payload;

    case SIDE_BAR_SERVER_SELECTED:
      return action.payload;

    case SIDE_BAR_REMOVE_SERVER_CLICKED: {
      if (state === action.payload) {
        return null;
      }
      return state;
    }

    case SIDE_BAR_ADD_NEW_SERVER_CLICKED:
      return null;

    case WEBVIEW_FOCUS_REQUESTED: {
      const { url } = action.payload;
      return url;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { currentServerUrl = state } = action.payload;
      return currentServerUrl;
    }
  }

  return state;
};
