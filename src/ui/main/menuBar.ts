import path from 'path';

import type { MenuItemConstructorOptions } from 'electron';
import { app, BrowserWindow, Menu, shell } from 'electron';
import i18next from 'i18next';
import { createSelector, createStructuredSelector } from 'reselect';

import { relaunchApp } from '../../app/main/app';
import { CERTIFICATES_CLEARED } from '../../navigation/actions';
import { dispatch, select, Service } from '../../store';
import type { RootState } from '../../store/rootReducer';
import { UPDATES_CHECK_FOR_UPDATES_REQUESTED } from '../../updates/actions';
import * as urls from '../../urls';
import { openExternal } from '../../utils/browserLauncher';
import { openVideoCallWebviewDevTools } from '../../videoCallWindow/ipc';
import {
  APP_MENU_TRIGGERED,
  CLEAR_CACHE_TRIGGERED,
  MENU_BAR_ABOUT_CLICKED,
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  MENU_BAR_SELECT_SERVER_CLICKED,
  MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
  WEBVIEW_SERVER_RELOADED,
} from '../actions';
import { askForAppDataReset } from './dialogs';
import { getRootWindow } from './rootWindow';
import { getWebContentsByServerUrl } from './serverView';

const t = i18next.t.bind(i18next);

const on = (
  condition: boolean,
  getMenuItems: () => MenuItemConstructorOptions[]
): MenuItemConstructorOptions[] => (condition ? getMenuItems() : []);

const selectAddServersDeps = createStructuredSelector({
  isAddNewServersEnabled: ({ isAddNewServersEnabled }: RootState) =>
    isAddNewServersEnabled,
});

const createAboutMenuItem = (): MenuItemConstructorOptions => ({
  id: 'about',
  label: t('menus.about', { appName: app.name }),
  click: async () => {
    const browserWindow = await getRootWindow();

    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();
    dispatch({ type: MENU_BAR_ABOUT_CLICKED });
  },
});

const createAddNewServerMenuItem = (): MenuItemConstructorOptions => ({
  id: 'addNewServer',
  label: t('menus.addNewServer'),
  accelerator: 'CommandOrControl+N',
  click: async () => {
    const browserWindow = await getRootWindow();

    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();
    dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
  },
});

const createDisableGpuMenuItem = (): MenuItemConstructorOptions => ({
  id: 'disableGpu',
  label: t('menus.disableGpu'),
  enabled: !app.commandLine.hasSwitch('disable-gpu'),
  click: () => {
    relaunchApp('--disable-gpu');
  },
});

const createQuitMenuItem = (): MenuItemConstructorOptions => ({
  id: 'quit',
  label: t('menus.quit', { appName: app.name }),
  accelerator: 'CommandOrControl+Q',
  click: () => {
    app.quit();
  },
});

const selectAdjacentServer = async (
  servers: RootState['servers'],
  currentView: RootState['currentView'],
  direction: 1 | -1
): Promise<void> => {
  if (servers.length === 0) {
    return;
  }

  const currentIndex =
    typeof currentView === 'object'
      ? servers.findIndex((server) => server.url === currentView.url)
      : -1;
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + servers.length) % servers.length;

  const browserWindow = await getRootWindow();

  if (!browserWindow.isVisible()) {
    browserWindow.showInactive();
  }
  browserWindow.focus();
  dispatch({
    type: MENU_BAR_SELECT_SERVER_CLICKED,
    payload: servers[nextIndex].url,
  });
};

export const createAppMenu = createSelector(
  selectAddServersDeps,
  ({ isAddNewServersEnabled }): MenuItemConstructorOptions => ({
    id: 'appMenu',
    label: process.platform === 'darwin' ? app.name : t('menus.fileMenu'),
    submenu: [
      ...on(process.platform === 'darwin', () => [
        createAboutMenuItem(),
        { type: 'separator' },
        {
          id: 'preferences',
          label: t('menus.preferences'),
          accelerator: 'Command+,',
          click: async () => {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();
            dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
          },
        },
        { type: 'separator' },
        {
          id: 'services',
          label: t('menus.services'),
          role: 'services',
        },
        { type: 'separator' },
        {
          id: 'hide',
          label: t('menus.hide', { appName: app.name }),
          role: 'hide',
        },
        {
          id: 'hideOthers',
          label: t('menus.hideOthers'),
          role: 'hideOthers',
        },
        {
          id: 'unhide',
          label: t('menus.unhide'),
          role: 'unhide',
        },
        { type: 'separator' },
      ]),
      ...on(process.platform !== 'darwin' && isAddNewServersEnabled, () => [
        createAddNewServerMenuItem(),
        { type: 'separator' },
      ]),
      createDisableGpuMenuItem(),
      { type: 'separator' },
      createQuitMenuItem(),
    ],
  })
);

export const createEditMenu = createSelector(
  (_: RootState) => undefined,
  (): MenuItemConstructorOptions => ({
    id: 'editMenu',
    label: t('menus.editMenu'),
    submenu: [
      {
        id: 'undo',
        label: t('menus.undo'),
        role: 'undo',
      },
      {
        id: 'redo',
        label: t('menus.redo'),
        role: 'redo',
      },
      { type: 'separator' },
      {
        id: 'cut',
        label: t('menus.cut'),
        role: 'cut',
      },
      {
        id: 'copy',
        label: t('menus.copy'),
        role: 'copy',
      },
      {
        id: 'paste',
        label: t('menus.paste'),
        role: 'paste',
      },
      {
        id: 'selectAll',
        label: t('menus.selectAll'),
        role: 'selectAll',
      },
    ],
  })
);

const selectViewDeps = createStructuredSelector({
  currentView: ({ currentView }: RootState) => currentView,
  isTrayIconEnabled: ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled,
  isMenuBarEnabled: ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled,
  rootWindowState: ({ rootWindowState }: RootState) => rootWindowState,
  navigationLayout: ({ navigationLayout }: RootState) => navigationLayout,
});

const getCurrentView = async () => {
  const browserWindow = await getRootWindow();

  if (!browserWindow.isVisible()) {
    browserWindow.showInactive();
  }
  browserWindow.focus();
  return select(({ currentView }) => currentView);
};

const getCurrentViewWebcontents = async () => {
  const currentView = await getCurrentView();
  const url = typeof currentView === 'object' ? currentView.url : null;
  if (!url) {
    return null;
  }
  return getWebContentsByServerUrl(url);
};

export const createViewMenu = createSelector(
  selectViewDeps,
  ({
    currentView,
    isTrayIconEnabled,
    isMenuBarEnabled,
    rootWindowState,
    navigationLayout,
  }): MenuItemConstructorOptions => ({
    id: 'viewMenu',
    label: t('menus.viewMenu'),
    submenu: [
      {
        id: 'reload',
        label: t('menus.reload'),
        accelerator: 'CommandOrControl+R',
        enabled: typeof currentView === 'object' && !!currentView.url,
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          guestWebContents?.reload();
          const currentView = await getCurrentView();
          if (typeof currentView === 'object' && !!currentView.url) {
            dispatch({
              type: WEBVIEW_SERVER_RELOADED,
              payload: { url: currentView.url },
            });
          }
        },
      },
      {
        id: 'reloadClearingCache',
        label: t('menus.reloadClearingCache'),
        enabled: typeof currentView === 'object' && !!currentView.url,
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          if (guestWebContents)
            dispatch({
              type: CLEAR_CACHE_TRIGGERED,
              payload: guestWebContents.id,
            });
          const currentView = await getCurrentView();
          if (typeof currentView === 'object' && !!currentView.url) {
            dispatch({
              type: WEBVIEW_SERVER_RELOADED,
              payload: { url: currentView.url },
            });
          }
        },
      },
      {
        id: 'openDevTools',
        label: t('menus.openDevTools'),
        enabled: typeof currentView === 'object' && !!currentView.url,
        accelerator:
          process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          guestWebContents?.toggleDevTools();
        },
      },
      {
        id: 'openDevToolsOnAllWindows',
        label: t('menus.openDevToolsOnAllWindows'),
        enabled: typeof currentView === 'object' && !!currentView.url,
        accelerator:
          process.platform === 'darwin' ? 'Command+Alt+G' : 'Ctrl+Shift+G',
        click: async () => {
          const windows = BrowserWindow.getAllWindows();
          windows.forEach((window) => {
            window.webContents.toggleDevTools();
          });
        },
      },
      { type: 'separator' },
      {
        id: 'back',
        label: t('menus.back'),
        enabled: typeof currentView === 'object' && !!currentView.url,
        accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          guestWebContents?.goBack();
        },
      },
      {
        id: 'forward',
        label: t('menus.forward'),
        enabled: typeof currentView === 'object' && !!currentView.url,
        accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          guestWebContents?.goForward();
        },
      },
      { type: 'separator' },
      {
        id: 'showTrayIcon',
        label: t('menus.showTrayIcon'),
        type: 'checkbox',
        checked: isTrayIconEnabled,
        accelerator:
          process.platform === 'darwin' ? 'Shift+Command+T' : 'Ctrl+Shift+T',
        click: ({ checked }) => {
          setTimeout(() => {
            dispatch({
              type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
              payload: checked,
            });
          }, 10);
        },
      },
      ...on(process.platform === 'darwin', () => [
        {
          id: 'showFullScreen',
          label: t('menus.showFullScreen'),
          type: 'checkbox',
          checked: rootWindowState.fullscreen,
          accelerator: 'Control+Command+F',
          click: async ({ checked: enabled }) => {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();
            browserWindow.setFullScreen(enabled);
          },
        },
      ]),
      ...on(process.platform === 'linux', () => [
        {
          id: 'showMenuBar',
          label: t('menus.showMenuBar'),
          type: 'checkbox',
          checked: isMenuBarEnabled,
          enabled: !isMenuBarEnabled || navigationLayout === 'sidebar',
          accelerator:
            process.platform === 'darwin' ? 'Shift+Command+M' : 'Ctrl+Shift+M',
          click: async ({ checked }) => {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();
            dispatch({
              type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
              payload: checked,
            });
          },
        },
      ]),
      {
        id: 'workspaceTabs',
        label: t('menus.workspaceTabs'),
        type: 'radio',
        checked: navigationLayout === 'tabs',
        enabled:
          process.platform !== 'linux' ||
          isMenuBarEnabled ||
          navigationLayout === 'tabs',
        click: async () => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({
            type: MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
            payload: 'tabs',
          });
        },
      },
      {
        id: 'workspaceBar',
        label: t('menus.workspaceBar'),
        type: 'radio',
        checked: navigationLayout === 'sidebar',
        accelerator:
          process.platform === 'darwin' ? 'Shift+Command+S' : 'Ctrl+Shift+S',
        click: async () => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({
            type: MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
            payload: 'sidebar',
          });
        },
      },
      { type: 'separator' },
      {
        id: 'resetZoom',
        label: t('menus.resetZoom'),
        accelerator: 'CommandOrControl+0',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          if (!guestWebContents) {
            return;
          }

          guestWebContents?.setZoomLevel(0);

          const rootWindow = await getRootWindow();
          rootWindow.focus();
          rootWindow.webContents.setZoomLevel(0);
        },
      },
      {
        id: 'zoomIn',
        label: t('menus.zoomIn'),
        accelerator: 'CommandOrControl+=',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          if (!guestWebContents) {
            return;
          }

          const zoomLevel = guestWebContents.getZoomLevel();
          if (zoomLevel >= 9) {
            return;
          }
          guestWebContents.setZoomLevel(zoomLevel + 1);

          const rootWindow = await getRootWindow();
          rootWindow.focus();
          rootWindow.webContents.setZoomLevel(zoomLevel + 1);
        },
      },
      {
        id: 'zoomOut',
        label: t('menus.zoomOut'),
        accelerator: 'CommandOrControl+-',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          if (!guestWebContents) {
            return;
          }
          const zoomLevel = guestWebContents.getZoomLevel();
          if (zoomLevel <= -9) {
            return;
          }
          guestWebContents.setZoomLevel(zoomLevel - 1);

          const rootWindow = await getRootWindow();
          rootWindow.focus();
          rootWindow.webContents.setZoomLevel(zoomLevel - 1);
        },
      },
    ],
  })
);

const selectWindowDeps = createStructuredSelector({
  servers: ({ servers }: RootState) => servers,
  currentView: ({ currentView }: RootState) => currentView,
  isShowWindowOnUnreadChangedEnabled: ({
    isShowWindowOnUnreadChangedEnabled,
  }: RootState) => isShowWindowOnUnreadChangedEnabled,
  isAddNewServersEnabled: ({ isAddNewServersEnabled }: RootState) =>
    isAddNewServersEnabled,
});

export const createWindowMenu = createSelector(
  selectWindowDeps,
  ({
    servers,
    currentView,
    isShowWindowOnUnreadChangedEnabled,
    isAddNewServersEnabled,
  }): MenuItemConstructorOptions => ({
    id: 'windowMenu',
    label: t('menus.windowMenu'),
    role: 'windowMenu',
    submenu: [
      ...on(process.platform === 'darwin' && isAddNewServersEnabled, () => [
        {
          id: 'addNewServer',
          label: t('menus.addNewServer'),
          accelerator: 'CommandOrControl+N',
          click: async () => {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();
            dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
          },
        },
        { type: 'separator' },
      ]),
      ...on(servers.length > 0, () => [
        ...servers.map(
          (server, i): MenuItemConstructorOptions => ({
            id: server.url,
            type:
              typeof currentView === 'object' && currentView.url === server.url
                ? 'checkbox'
                : 'normal',
            label: server.title?.replace(/&/g, '&&'),
            checked:
              typeof currentView === 'object' && currentView.url === server.url,
            accelerator: `CommandOrControl+${i + 1}`,
            click: async () => {
              const browserWindow = await getRootWindow();

              if (!browserWindow.isVisible()) {
                browserWindow.showInactive();
              }
              browserWindow.focus();
              setTimeout(() => {
                dispatch({
                  type: MENU_BAR_SELECT_SERVER_CLICKED,
                  payload: server.url,
                });
              }, 100);
            },
          })
        ),
        {
          id: 'nextWorkspace',
          label: t('menus.nextWorkspace'),
          visible: false,
          accelerator: 'CommandOrControl+Tab',
          click: async () => {
            await selectAdjacentServer(servers, currentView, 1);
          },
        },
        {
          id: 'previousWorkspace',
          label: t('menus.previousWorkspace'),
          visible: false,
          accelerator: 'CommandOrControl+Shift+Tab',
          click: async () => {
            await selectAdjacentServer(servers, currentView, -1);
          },
        },
        { type: 'separator' },
      ]),
      {
        id: 'downloads',
        label: t('menus.downloads'),
        checked: currentView === 'downloads',
        accelerator: 'CommandOrControl+D',
        click: async () => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
        },
      },
      {
        id: 'settings',
        label: t('menus.settings'),
        checked: currentView === 'settings',
        accelerator: 'CommandOrControl+,',
        click: async () => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
        },
      },
      {
        id: 'showOnUnreadMessage',
        type: 'checkbox',
        label: t('menus.showOnUnreadMessage'),
        checked: isShowWindowOnUnreadChangedEnabled,
        click: async ({ checked }) => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({
            type: MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
            payload: checked,
          });
        },
      },
      { type: 'separator' },
      {
        id: 'minimize',
        role: 'minimize',
        label: t('menus.minimize'),
        accelerator: 'CommandOrControl+M',
      },
      {
        id: 'close',
        role: 'close',
        label: t('menus.close'),
        accelerator: 'CommandOrControl+W',
      },
    ],
  })
);

const selectHelpDeps = createStructuredSelector({
  isDeveloperModeEnabled: ({ isDeveloperModeEnabled }: RootState) =>
    isDeveloperModeEnabled,
  isVideoCallDevtoolsAutoOpenEnabled: ({
    isVideoCallDevtoolsAutoOpenEnabled,
  }: RootState) => isVideoCallDevtoolsAutoOpenEnabled,
});

export const createHelpMenu = createSelector(
  selectHelpDeps,
  ({
    isDeveloperModeEnabled,
    isVideoCallDevtoolsAutoOpenEnabled,
  }): MenuItemConstructorOptions => ({
    id: 'helpMenu',
    label: t('menus.helpMenu'),
    role: 'help',
    submenu: [
      {
        id: 'documentation',
        label: t('menus.documentation'),
        click: () => {
          openExternal(urls.docs.index);
        },
      },
      {
        id: 'reportIssue',
        label: t('menus.reportIssue'),
        click: () => {
          openExternal(urls.docs.newIssue);
        },
      },
      { type: 'separator' },
      {
        id: 'reload-window',
        label: t('menus.reload'),
        accelerator: 'CommandOrControl+Shift+R',
        click: async () => {
          const guestWebContents = await getCurrentViewWebcontents();
          if (guestWebContents)
            dispatch({
              type: CLEAR_CACHE_TRIGGERED,
              payload: guestWebContents.id,
            });
          const currentView = await getCurrentView();
          if (typeof currentView === 'object' && !!currentView.url) {
            dispatch({
              type: WEBVIEW_SERVER_RELOADED,
              payload: { url: currentView.url },
            });
          }
        },
      },
      {
        id: 'toggleDevTools',
        label: t('menus.toggleDevTools'),
        accelerator: 'CommandOrControl+Shift+D',
        click: async () => {
          // Target the focused window (e.g. the video call window) so DevTools
          // open where the user is looking; fall back to the main window when
          // nothing is focused.
          const browserWindow =
            BrowserWindow.getFocusedWindow() ?? (await getRootWindow());

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          browserWindow.webContents.toggleDevTools();
        },
      },
      {
        id: 'openLogViewer',
        label: t('menus.openLogViewer'),
        accelerator: 'CommandOrControl+Shift+L',
        click: async () => {
          try {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();

            const { openLogViewerWindow } = await import(
              '../../logViewerWindow/ipc'
            );
            await openLogViewerWindow();
          } catch (error) {
            console.error('Error opening log viewer:', error);
          }
        },
      },
      {
        id: 'developerMode',
        type: 'checkbox',
        label: t('menus.developerMode'),
        checked: isDeveloperModeEnabled,
        click: async ({ checked }) => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({
            type: MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED,
            payload: checked,
          });
        },
      },
      {
        id: 'videoCallToolsSubmenu',
        label: t('menus.videoCallTools'),
        submenu: [
          {
            id: 'videoCallDevTools',
            label: t('menus.videoCallDevTools'),
            click: async () => {
              const browserWindow = await getRootWindow();

              if (!browserWindow.isVisible()) {
                browserWindow.showInactive();
              }
              browserWindow.focus();

              try {
                const success = await openVideoCallWebviewDevTools();
                if (!success) {
                  console.log(
                    'No video call window available for developer tools'
                  );
                }
              } catch (error) {
                console.error(
                  'Error opening video call developer tools:',
                  error
                );
              }
            },
          },
          {
            id: 'videoCallDevToolsAutoOpen',
            type: 'checkbox',
            label: t('menus.videoCallDevToolsAutoOpen'),
            checked: isVideoCallDevtoolsAutoOpenEnabled,
            click: async ({ checked }) => {
              const browserWindow = await getRootWindow();

              if (!browserWindow.isVisible()) {
                browserWindow.showInactive();
              }
              browserWindow.focus();
              dispatch({
                type: MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED,
                payload: checked,
              });
            },
          },
        ],
      },
      {
        id: 'openConfigFolder',
        label: t('menus.openConfigFolder'),
        click: async () => {
          shell.showItemInFolder(
            path.join(app.getPath('userData'), 'config.json')
          );
        },
      },
      { type: 'separator' },
      {
        id: 'clearTrustedCertificates',
        label: t('menus.clearTrustedCertificates'),
        click: async () => {
          const browserWindow = await getRootWindow();

          if (!browserWindow.isVisible()) {
            browserWindow.showInactive();
          }
          browserWindow.focus();
          dispatch({ type: CERTIFICATES_CLEARED });
        },
      },
      ...on(!process.mas, () => [
        {
          id: 'resetAppData',
          label: t('menus.resetAppData'),
          click: async () => {
            const permitted = await askForAppDataReset();

            if (permitted) {
              relaunchApp('--reset-app-data');
            }
          },
        },
      ]),
      { type: 'separator' },
      {
        id: 'learnMore',
        label: t('menus.learnMore'),
        click: () => {
          openExternal(urls.rocketchat.site);
        },
      },
      ...on(process.platform !== 'darwin', () => [
        {
          id: 'about',
          label: t('menus.about', { appName: app.name }),
          click: async () => {
            const browserWindow = await getRootWindow();

            if (!browserWindow.isVisible()) {
              browserWindow.showInactive();
            }
            browserWindow.focus();
            dispatch({ type: MENU_BAR_ABOUT_CLICKED });
          },
        },
      ]),
    ],
  })
);

export const selectMenuBarTemplate = createSelector(
  [
    createAppMenu,
    createEditMenu,
    createViewMenu,
    createWindowMenu,
    createHelpMenu,
  ],
  (...menus) => menus
);

export const selectMenuBarTemplateAsJson = createSelector(
  selectMenuBarTemplate,
  (template) => JSON.stringify(template)
);

const createRocketChatMenu = createSelector(
  (_: RootState) => undefined,
  (): MenuItemConstructorOptions => ({
    id: 'rocketChatMenu',
    label: app.name,
    submenu: [
      createAboutMenuItem(),
      { type: 'separator' },
      createDisableGpuMenuItem(),
    ],
  })
);

const createFileMenu = createSelector(
  selectAddServersDeps,
  ({ isAddNewServersEnabled }): MenuItemConstructorOptions => ({
    id: 'fileMenu',
    label: t('menus.fileMenu'),
    submenu: [
      ...on(isAddNewServersEnabled, () => [createAddNewServerMenuItem()]),
    ],
  })
);

export const selectAppMenuPopupTemplate = createSelector(
  [
    createRocketChatMenu,
    createFileMenu,
    createEditMenu,
    createViewMenu,
    createWindowMenu,
    createHelpMenu,
  ],
  (
    rocketChatMenu,
    fileMenu,
    editMenu,
    viewMenu,
    windowMenu,
    helpMenu
  ): MenuItemConstructorOptions[] => [
    rocketChatMenu,
    fileMenu,
    editMenu,
    viewMenu,
    {
      ...windowMenu,
      submenu: (windowMenu.submenu as MenuItemConstructorOptions[]).filter(
        (item) => item.id !== 'settings' && item.id !== 'downloads'
      ),
    },
    helpMenu,
    { type: 'separator' },
    {
      id: 'settings',
      label: t('menus.settings'),
      accelerator: 'CommandOrControl+,',
      click: () => {
        dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
      },
    },
    {
      id: 'downloads',
      label: t('menus.downloads'),
      accelerator: 'CommandOrControl+D',
      click: () => {
        dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
      },
    },
    {
      id: 'checkForUpdates',
      label: t('menus.checkForUpdates'),
      click: () => {
        dispatch({ type: UPDATES_CHECK_FOR_UPDATES_REQUESTED });
      },
    },
    { type: 'separator' },
    createQuitMenuItem(),
  ]
);

class MenuBarService extends Service {
  protected initialize(): void {
    this.watch(selectMenuBarTemplateAsJson, async () => {
      const menuBarTemplate = select(selectMenuBarTemplate);
      const menu = Menu.buildFromTemplate(menuBarTemplate);

      if (process.platform === 'darwin') {
        Menu.setApplicationMenu(menu);
        return;
      }

      const browserWindow = await getRootWindow();

      if (process.platform === 'win32') {
        Menu.setApplicationMenu(null);
        browserWindow.setMenu(menu);
        browserWindow.setMenuBarVisibility(false);
        browserWindow.autoHideMenuBar = false;
        return;
      }

      Menu.setApplicationMenu(null);
      browserWindow.setMenu(menu);
    });

    this.listen(APP_MENU_TRIGGERED, async (action) => {
      const menu = Menu.buildFromTemplate(select(selectAppMenuPopupTemplate));
      menu.popup({
        window: await getRootWindow(),
        x: Math.round(action.payload.x),
        y: Math.round(action.payload.y),
      });
    });
  }
}

export default new MenuBarService();
