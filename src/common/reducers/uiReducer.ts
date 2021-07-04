import { createReducer } from '@reduxjs/toolkit';

import * as clientCertificateActions from '../actions/clientCertificateActions';
import * as dialogActions from '../actions/dialogActions';
import * as flashWindowActions from '../actions/flashWindowActions';
import * as menuBarActions from '../actions/menuBarActions';
import * as messageBoxActions from '../actions/messageBoxActions';
import * as rootWindowActions from '../actions/rootWindowActions';
import * as screenSharingActions from '../actions/screenSharingActions';
import * as serverActions from '../actions/serverActions';
import * as sideBarActions from '../actions/sideBarActions';
import * as trayIconActions from '../actions/trayIconActions';
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
    devToolsOpen: boolean;
  };
  sideBar: {
    enabled: boolean;
  };
  trayIcon: {
    enabled: boolean;
  };
  flashWindow: {
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
      devToolsOpen: process.env.NODE_ENV === 'development',
    },
    sideBar: {
      enabled: true,
    },
    trayIcon: {
      enabled: process.platform !== 'linux',
    },
    flashWindow: {
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
      .addCase(serverActions.added, (state, action) => {
        const { url } = action.payload;
        state.view = { url };
      })
      .addCase(serverActions.removed, (state, action) => {
        const { url } = action.payload;
        if (typeof state.view === 'object' && state.view.url === url) {
          state.view = 'add-new-server';
        }
      })
      .addCase(dialogActions.push, (state, action) => {
        const { name } = action.payload;
        state.openDialog = name;
      })
      .addCase(dialogActions.pop, (state) => {
        state.openDialog = null;
      })
      .addCase(updateCheckActions.newVersionAvailable, (state) => {
        state.openDialog = 'update';
      })
      .addCase(screenSharingActions.sourceRequested, (state) => {
        state.openDialog = 'screen-sharing';
      })
      .addCase(clientCertificateActions.requested, (state) => {
        state.openDialog = 'select-client-certificate';
      })
      .addCase(screenSharingActions.sourceSelected, (state) => {
        state.openDialog = null;
      })
      .addCase(screenSharingActions.sourceDenied, (state) => {
        state.openDialog = null;
      })
      .addCase(clientCertificateActions.selected, (state) => {
        state.openDialog = null;
      })
      .addCase(clientCertificateActions.dismissed, (state) => {
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
      .addCase(rootWindowActions.devToolsToggled, (state, action) => {
        const { enabled } = action.payload;
        state.rootWindow.devToolsOpen = enabled;
      })
      .addCase(menuBarActions.toggled, (state, action) => {
        const { enabled } = action.payload;
        state.menuBar.enabled = enabled;
      })
      .addCase(sideBarActions.toggled, (state, action) => {
        const { enabled } = action.payload;
        state.sideBar.enabled = enabled;
      })
      .addCase(messageBoxActions.focused, (state) => {
        state.messageBox.focused = true;
      })
      .addCase(messageBoxActions.blurred, (state) => {
        state.messageBox.focused = false;
      })
      .addCase(serverActions.loading, (state, action) => {
        const { url } = action.payload;
        if (typeof state.view === 'object' && state.view.url === url) {
          state.messageBox.focused = false;
        }
      })
      .addCase(serverActions.failedToLoad, (state, action) => {
        const { url } = action.payload;
        if (typeof state.view === 'object' && state.view.url === url) {
          state.messageBox.focused = false;
        }
      })
      .addCase(trayIconActions.toggled, (state, action) => {
        const { enabled } = action.payload;
        state.trayIcon.enabled = enabled;
      })
      .addCase(flashWindowActions.toggled, (state, action) => {
        const { enabled } = action.payload;
        state.flashWindow.enabled = enabled;
      })
      .addCase(rootWindowActions.showOnBadgeChangeToggled, (state, action) => {
        const { enabled } = action.payload;
        state.rootWindow.showOnBadgeChange = enabled;
      })
);
