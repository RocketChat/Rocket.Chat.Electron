import { Menu, app, shell, MenuItemConstructorOptions } from 'electron';
import i18next from 'i18next';
import { createSelector } from 'reselect';

import {
  MENU_BAR_ABOUT_CLICKED,
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  CERTIFICATES_CLEARED,
  MENU_BAR_SELECT_SERVER_CLICKED,
  MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
  MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
} from '../../actions';
import {
  selectCanCopy,
  selectCanCut,
  selectCanPaste,
  selectCanRedo,
  selectCanSelectAll,
  selectCanUndo,
  selectCurrentServerUrl,
  selectFocusedWebContents,
  selectIsFullScreenEnabled,
  selectIsMenuBarEnabled,
  selectIsShowWindowOnUnreadChangedEnabled,
  selectIsSideBarEnabled,
  selectIsTrayIconEnabled,
  selectServers,
  selectIsServerSelected,
} from '../../selectors';
import { dispatch, watch } from '../../store';
import { relaunchApp } from '../app';
import { askForAppDataReset } from './dialogs';
import {
  getWebContentsByServerUrl,
  getAllServerWebContents,
  getRootWindow,
} from './rootWindow';

const t = i18next.t.bind(i18next);

export const setupMenuBar = (): void => {
  const selectAppMenuTemplate = createSelector([], (): MenuItemConstructorOptions => ({
    label: process.platform === 'darwin' ? app.name : t('menus.fileMenu'),
    submenu: [
      ...(process.platform === 'darwin' ? [
        {
          label: t('menus.about', { appName: app.name }),
          click: () => {
            getRootWindow().show();
            dispatch({ type: MENU_BAR_ABOUT_CLICKED });
          },
        },
        { type: 'separator' },
        {
          label: t('menus.services'),
          role: 'services',
        },
        { type: 'separator' },
        {
          label: t('menus.hide', { appName: app.name }),
          role: 'hide',
        },
        {
          label: t('menus.hideOthers'),
          role: 'hideothers',
        },
        {
          label: t('menus.unhide'),
          role: 'unhide',
        },
        { type: 'separator' },
      ] : []) as MenuItemConstructorOptions[],
      ...(process.platform !== 'darwin' ? [
        {
          label: t('menus.addNewServer'),
          accelerator: 'CommandOrControl+N',
          click: () => {
            getRootWindow().show();
            dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
          },
        },
        { type: 'separator' },
      ] : []) as MenuItemConstructorOptions[],
      {
        label: t('Disable GPU'),
        enabled: !app.commandLine.hasSwitch('disable-gpu'),
        click: () => {
          relaunchApp('--disable-gpu');
        },
      },
      { type: 'separator' },
      {
        label: t('menus.quit', { appName: app.name }),
        accelerator: 'CommandOrControl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  }));

  const selectEditMenuTemplate = createSelector([
    selectFocusedWebContents,
    selectCanUndo,
    selectCanRedo,
    selectCanCut,
    selectCanCopy,
    selectCanPaste,
    selectCanSelectAll,
  ], (focusedWebContents, canUndo, canRedo, canCut, canCopy, canPaste, canSelectAll): MenuItemConstructorOptions => ({
    label: t('menus.editMenu'),
    submenu: [
      {
        label: t('menus.undo'),
        accelerator: 'CommandOrControl+Z',
        enabled: !!focusedWebContents && canUndo,
        click: () => {
          focusedWebContents.undo();
        },
      },
      {
        label: t('menus.redo'),
        accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
        enabled: !!focusedWebContents && canRedo,
        click: () => {
          focusedWebContents.redo();
        },
      },
      { type: 'separator' },
      {
        label: t('menus.cut'),
        accelerator: 'CommandOrControl+X',
        enabled: !!focusedWebContents && canCut,
        click: () => {
          focusedWebContents.cut();
        },
      },
      {
        label: t('menus.copy'),
        accelerator: 'CommandOrControl+C',
        enabled: !!focusedWebContents && canCopy,
        click: () => {
          focusedWebContents.copy();
        },
      },
      {
        label: t('menus.paste'),
        accelerator: 'CommandOrControl+V',
        enabled: !!focusedWebContents && canPaste,
        click: () => {
          focusedWebContents.paste();
        },
      },
      {
        label: t('menus.selectAll'),
        accelerator: 'CommandOrControl+A',
        enabled: !!focusedWebContents && canSelectAll,
        click: () => {
          focusedWebContents.selectAll();
        },
      },
    ],
  }));

  const selectViewMenuTemplate = createSelector([
    selectCurrentServerUrl,
    selectIsServerSelected,
    selectIsSideBarEnabled,
    selectIsTrayIconEnabled,
    selectIsMenuBarEnabled,
    selectIsFullScreenEnabled,
  ], (currentServerUrl, isServerSelected, isSideBarEnabled, isTrayIconEnabled, isMenuBarEnabled, isFullScreenEnabled): MenuItemConstructorOptions => ({
    label: t('menus.viewMenu'),
    submenu: [
      {
        label: t('menus.reload'),
        accelerator: 'CommandOrControl+R',
        enabled: isServerSelected,
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.reload();
        },
      },
      {
        label: t('menus.reloadIgnoringCache'),
        enabled: isServerSelected,
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.reloadIgnoringCache();
        },
      },
      {
        label: t('menus.openDevTools'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.openDevTools();
        },
      },
      { type: 'separator' },
      {
        label: t('menus.back'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.goBack();
        },
      },
      {
        label: t('menus.forward'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.goForward();
        },
      },
      { type: 'separator' },
      {
        label: t('menus.showTrayIcon'),
        type: 'checkbox',
        checked: isTrayIconEnabled,
        click: ({ checked }) => {
          dispatch({
            type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
            payload: checked,
          });
        },
      },
      ...(process.platform === 'darwin' ? [
        {
          label: t('menus.showFullScreen'),
          type: 'checkbox',
          checked: isFullScreenEnabled,
          accelerator: 'Control+Command+F',
          click: ({ checked: enabled }) => {
            getRootWindow().show();
            getRootWindow().setFullScreen(enabled);
          },
        },
      ] : []) as MenuItemConstructorOptions[],
      ...(process.platform !== 'darwin' ? [
        {
          label: t('menus.showMenuBar'),
          type: 'checkbox',
          checked: isMenuBarEnabled,
          click: ({ checked }) => {
            getRootWindow().show();
            dispatch({
              type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
              payload: checked,
            });
          },
        },
      ] : []) as MenuItemConstructorOptions[],
      {
        label: t('menus.showServerList'),
        type: 'checkbox',
        checked: isSideBarEnabled,
        click: ({ checked }) => {
          getRootWindow().show();
          dispatch({
            type: MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
            payload: checked,
          });
        },
      },
      { type: 'separator' },
      {
        label: t('menus.resetZoom'),
        accelerator: 'CommandOrControl+0',
        click: () => {
          getRootWindow().show();
          getRootWindow().webContents.zoomLevel = 0;
        },
      },
      {
        label: t('menus.zoomIn'),
        accelerator: 'CommandOrControl+Plus',
        click: () => {
          getRootWindow().show();
          if (getRootWindow().webContents.zoomLevel >= 9) {
            return;
          }
          getRootWindow().webContents.zoomLevel++;
        },
      },
      {
        label: t('menus.zoomOut'),
        accelerator: 'CommandOrControl+-',
        click: () => {
          getRootWindow().show();
          if (getRootWindow().webContents.zoomLevel <= -9) {
            return;
          }
          getRootWindow().webContents.zoomLevel--;
        },
      },
    ],
  }));

  const selectWindowMenuTemplate = createSelector([
    selectServers,
    selectCurrentServerUrl,
    selectIsShowWindowOnUnreadChangedEnabled,
  ], (servers, currentServerUrl, isShowWindowOnUnreadChangedEnabled): MenuItemConstructorOptions => ({
    label: t('menus.windowMenu'),
    role: 'window',
    submenu: [
      ...(process.platform === 'darwin' ? [
        {
          label: t('menus.addNewServer'),
          accelerator: 'CommandOrControl+N',
          click: () => {
            getRootWindow().show();
            dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
          },
        },
        { type: 'separator' },
      ] : []) as MenuItemConstructorOptions[],
      ...(servers.length > 0 ? [
        ...servers.map((server, i) => ({
          type: currentServerUrl ? 'checkbox' : 'normal',
          label: server.title.replace(/&/g, '&&'),
          checked: currentServerUrl === server.url,
          accelerator: `CommandOrControl+${ i + 1 }`,
          click: () => {
            getRootWindow().show();
            dispatch({
              type: MENU_BAR_SELECT_SERVER_CLICKED,
              payload: server.url,
            });
          },
        })),
        { type: 'separator' },
      ] : []) as MenuItemConstructorOptions[],
      {
        type: 'checkbox',
        label: t('menus.showOnUnreadMessage'),
        checked: isShowWindowOnUnreadChangedEnabled,
        click: ({ checked }) => {
          getRootWindow().show();
          dispatch({
            type: MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
            payload: checked,
          });
        },
      },
      { type: 'separator' },
      {
        role: 'minimize',
        label: t('menus.minimize'),
        accelerator: 'CommandOrControl+M',
      },
      {
        role: 'close',
        label: t('menus.close'),
        accelerator: 'CommandOrControl+W',
      },
    ],
  }));

  const selectHelpMenuTemplate = createSelector([], (): MenuItemConstructorOptions => ({
    label: t('menus.helpMenu'),
    role: 'help',
    submenu: [
      {
        label: t('menus.documentation'),
        click: () => {
          shell.openExternal('https://rocket.chat/docs');
        },
      },
      {
        label: t('menus.reportIssue'),
        click: () => {
          shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues/new');
        },
      },
      { type: 'separator' },
      {
        label: t('menus.reload'),
        accelerator: 'CommandOrControl+Shift+R',
        click: () => {
          getRootWindow().show();
          getRootWindow().reload();
        },
      },
      {
        label: t('menus.toggleDevTools'),
        click: () => {
          getRootWindow().show();
          getRootWindow().webContents.toggleDevTools();
        },
      },
      { type: 'separator' },
      {
        label: t('menus.clearTrustedCertificates'),
        click: () => {
          getRootWindow().show();
          dispatch({ type: CERTIFICATES_CLEARED });
          getAllServerWebContents().forEach((webContents) => {
            webContents.reloadIgnoringCache();
          });
        },
      },
      {
        label: t('menus.resetAppData'),
        click: async () => {
          const permitted = await askForAppDataReset();

          if (permitted) {
            relaunchApp('--reset-app-data');
          }
        },
      },
      { type: 'separator' },
      {
        label: t('menus.learnMore'),
        click: () => {
          shell.openExternal('https://rocket.chat');
        },
      },
      ...process.platform !== 'darwin' ? [
        {
          label: t('menus.about', { appName: app.name }),
          click: () => {
            getRootWindow().show();
            dispatch({ type: MENU_BAR_ABOUT_CLICKED });
          },
        },
      ] : [],
    ],
  }));

  const selectMenuBarTemplate = createSelector([
    selectAppMenuTemplate,
    selectEditMenuTemplate,
    selectViewMenuTemplate,
    selectWindowMenuTemplate,
    selectHelpMenuTemplate,
  ], (...menus) => menus);

  watch(selectMenuBarTemplate, (menuBarTemplate) => {
    const menu = Menu.buildFromTemplate(menuBarTemplate);

    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(menu);
      return;
    }

    Menu.setApplicationMenu(null);
    getRootWindow().setMenu(menu);
  });
};
