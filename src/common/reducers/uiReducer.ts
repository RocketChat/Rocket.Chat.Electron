import { createReducer } from '@reduxjs/toolkit';

import type { ActionOf } from '../actions';
import { DEEP_LINKS_SERVER_ADDED } from '../actions/deepLinksActions';
import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../actions/navigationActions';
import * as rootWindowActions from '../actions/rootWindowActions';
import * as screenSharingActions from '../actions/screenSharingActions';
import {
  ABOUT_DIALOG_DISMISSED,
  ADD_SERVER_VIEW_SERVER_ADDED,
  MENU_BAR_ABOUT_CLICKED,
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  TOUCH_BAR_SELECT_SERVER_TOUCHED,
  UPDATE_DIALOG_DISMISSED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_FOCUS_REQUESTED,
  WEBVIEW_MESSAGE_BOX_BLURRED,
  WEBVIEW_MESSAGE_BOX_FOCUSED,
} from '../actions/uiActions';
import * as updateCheckActions from '../actions/updateCheckActions';
import * as viewActions from '../actions/viewActions';
import type { RootWindowIcon } from '../types/RootWindowIcon';
import type { WindowState } from '../types/WindowState';

type State = {
  menuBar: {
    enabled: boolean;
  };
  messageBox: {
    focused: boolean;
  };
  openDialog:
    | 'about'
    | 'update'
    | 'screen-sharing'
    | 'select-client-certificate'
    | null;
  rootWindow: {
    icon: RootWindowIcon | undefined;
    state: WindowState;
    showOnBadgeChange: boolean;
  };
  sideBar: {
    enabled: boolean;
  };
  trayIcon: {
    enabled: boolean;
  };
  view: 'add-new-server' | 'downloads' | { url: string };
};

export const uiReducer = createReducer<State>(
  {
    menuBar: {
      enabled: true,
    },
    messageBox: {
      focused: false,
    },
    openDialog: null,
    rootWindow: {
      icon: undefined,
      state: {
        focused: true,
        visible: true,
        maximized: false,
        minimized: false,
        fullscreen: false,
        normal: true,
        bounds: {
          x: undefined,
          y: undefined,
          width: 1000,
          height: 600,
        },
      },
      showOnBadgeChange: false,
    },
    sideBar: {
      enabled: true,
    },
    trayIcon: {
      enabled: process.platform !== 'linux',
    },
    view: 'add-new-server',
  },
  (builder) =>
    builder
      .addCase(viewActions.changed, (state, action) => {
        const { view } = action.payload;
        state.view = view;
      })
      .addCase(
        SIDE_BAR_REMOVE_SERVER_CLICKED,
        (state, action: ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>) => {
          if (
            typeof state.view === 'object' &&
            state.view.url === action.payload
          ) {
            state.view = 'add-new-server';
          }
        }
      )
      .addCase(SIDE_BAR_DOWNLOADS_BUTTON_CLICKED, (state) => {
        state.view = 'downloads';
      })
      .addCase(
        ADD_SERVER_VIEW_SERVER_ADDED,
        (state, action: ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>) => {
          const url = action.payload;
          state.view = { url };
        }
      )
      .addCase(
        DEEP_LINKS_SERVER_ADDED,
        (state, action: ActionOf<typeof DEEP_LINKS_SERVER_ADDED>) => {
          const url = action.payload;
          state.view = { url };
        }
      )
      .addCase(
        TOUCH_BAR_SELECT_SERVER_TOUCHED,
        (state, action: ActionOf<typeof TOUCH_BAR_SELECT_SERVER_TOUCHED>) => {
          const url = action.payload;
          state.view = { url };
        }
      )
      .addCase(
        SIDE_BAR_SERVER_SELECTED,
        (state, action: ActionOf<typeof SIDE_BAR_SERVER_SELECTED>) => {
          const url = action.payload;
          state.view = { url };
        }
      )
      .addCase(
        WEBVIEW_FOCUS_REQUESTED,
        (state, action: ActionOf<typeof WEBVIEW_FOCUS_REQUESTED>) => {
          const { url } = action.payload;
          state.view = { url };
        }
      )
      .addCase(MENU_BAR_ABOUT_CLICKED, (state) => {
        state.openDialog = 'about';
      })
      .addCase(updateCheckActions.newVersionAvailable, (state) => {
        state.openDialog = 'update';
      })
      .addCase(screenSharingActions.sourceRequested, (state) => {
        state.openDialog = 'screen-sharing';
      })
      .addCase(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, (state) => {
        state.openDialog = 'select-client-certificate';
      })
      .addCase(ABOUT_DIALOG_DISMISSED, (state) => {
        state.openDialog = null;
      })
      .addCase(screenSharingActions.sourceSelected, (state) => {
        state.openDialog = null;
      })
      .addCase(screenSharingActions.sourceDenied, (state) => {
        state.openDialog = null;
      })
      .addCase(
        SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        (state) => {
          state.openDialog = null;
        }
      )
      .addCase(SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED, (state) => {
        state.openDialog = null;
      })
      .addCase(UPDATE_DIALOG_DISMISSED, (state) => {
        state.openDialog = null;
      })
      .addCase(UPDATE_DIALOG_SKIP_UPDATE_CLICKED, (state) => {
        state.openDialog = null;
      })
      .addCase(UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED, (state) => {
        state.openDialog = null;
      })
      .addCase(UPDATE_DIALOG_INSTALL_BUTTON_CLICKED, (state) => {
        state.openDialog = null;
      })
      .addCase(rootWindowActions.iconChanged, (state, action) => {
        const { icon } = action.payload;
        state.rootWindow.icon = icon;
      })
      .addCase(rootWindowActions.stateChanged, (state, action) => {
        const { state: windowState } = action.payload;
        state.rootWindow.state = windowState;
      })
      .addCase(
        MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
        (
          state,
          action: ActionOf<typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED>
        ) => {
          const enabled = action.payload;
          state.menuBar.enabled = enabled;
        }
      )
      .addCase(
        MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
        (
          state,
          action: ActionOf<typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED>
        ) => {
          const enabled = action.payload;
          state.sideBar.enabled = enabled;
        }
      )
      .addCase(WEBVIEW_MESSAGE_BOX_FOCUSED, (state) => {
        state.messageBox.focused = true;
      })
      .addCase(WEBVIEW_MESSAGE_BOX_BLURRED, (state) => {
        state.messageBox.focused = false;
      })
      .addCase(WEBVIEW_DID_START_LOADING, (state) => {
        state.messageBox.focused = false;
      })
      .addCase(WEBVIEW_DID_FAIL_LOAD, (state) => {
        state.messageBox.focused = false;
      })
      .addCase(
        MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
        (
          state,
          action: ActionOf<typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED>
        ) => {
          const enabled = action.payload;
          state.trayIcon.enabled = enabled;
        }
      )
      .addCase(
        MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
        (
          state,
          action: ActionOf<
            typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED
          >
        ) => {
          const enabled = action.payload;
          state.rootWindow.showOnBadgeChange = enabled;
        }
      )
);
