import { Menu, app, shell, MenuItemConstructorOptions, MenuItem } from 'electron';
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
import { RootState } from '../../reducers';
import { dispatch, watch } from '../../store';
import { relaunchApp } from '../app';
import { askForAppDataReset } from './dialogs';
import {
  getWebContentsByServerUrl,
  getAllServerWebContents,
  getRootWindow,
} from './rootWindow';

const t = i18next.t.bind(i18next);

const menuItems = new Map<MenuItem['id'], MenuItem>();

const createMenuItem = (options: MenuItemConstructorOptions & { id: MenuItemConstructorOptions['id'] }): MenuItem => {
  console.log(options.id);
  if (!menuItems.has(options.id)) {
    menuItems.set(options.id, new MenuItem(options));
  }

  const menuItem = menuItems.get(options.id);
  menuItem.click = options.click;
  menuItem.checked = options.checked;
  menuItem.enabled = options.enabled ?? true;
  menuItem.label = options.label;

  return menuItem;
};

const separator = new MenuItem({ type: 'separator' });

const createAppMenu = (): MenuItem => createMenuItem({
  id: 'appMenu',
  label: process.platform === 'darwin' ? app.name : t('menus.fileMenu'),
  submenu: Menu.buildFromTemplate([
    ...process.platform === 'darwin' ? [
      createMenuItem({
        id: 'about',
        label: t('menus.about', { appName: app.name }),
        click: () => {
          getRootWindow().show();
          dispatch({ type: MENU_BAR_ABOUT_CLICKED });
        },
      }),
      separator,
      createMenuItem({
        id: 'services',
        label: t('menus.services'),
        role: 'services',
      }),
      separator,
      createMenuItem({
        id: 'hide',
        label: t('menus.hide', { appName: app.name }),
        role: 'hide',
      }),
      createMenuItem({
        id: 'hideOthers',
        label: t('menus.hideOthers'),
        role: 'hideOthers',
      }),
      createMenuItem({
        id: 'unhide',
        label: t('menus.unhide'),
        role: 'unhide',
      }),
      separator,
    ] : [],
    ...process.platform !== 'darwin' ? [
      createMenuItem({
        id: 'addNewServer',
        label: t('menus.addNewServer'),
        accelerator: 'CommandOrControl+N',
        click: () => {
          getRootWindow().show();
          dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
        },
      }),
      separator,
    ] : [],
    createMenuItem({
      id: 'disableGpu',
      label: t('menus.disableGpu'),
      enabled: !app.commandLine.hasSwitch('disable-gpu'),
      click: () => {
        relaunchApp('--disable-gpu');
      },
    }),
    { type: 'separator' },
    createMenuItem({
      id: 'quit',
      label: t('menus.quit', { appName: app.name }),
      accelerator: 'CommandOrControl+Q',
      click: () => {
        app.quit();
      },
    }),
  ]),
});

const createEditMenu = (): MenuItem => createMenuItem({
  id: 'editMenu',
  label: t('menus.editMenu'),
  submenu: Menu.buildFromTemplate([
    createMenuItem({
      id: 'undo',
      label: t('menus.undo'),
      role: 'undo',
    }),
    createMenuItem({
      id: 'redo',
      label: t('menus.redo'),
      role: 'redo',
    }),
    separator,
    createMenuItem({
      id: 'cut',
      label: t('menus.cut'),
      role: 'cut',
    }),
    createMenuItem({
      id: 'copy',
      label: t('menus.copy'),
      role: 'copy',
    }),
    createMenuItem({
      id: 'paste',
      label: t('menus.paste'),
      role: 'paste',
    }),
    createMenuItem({
      id: 'selectAll',
      label: t('menus.selectAll'),
      role: 'selectAll',
    }),
  ]),
});

const createViewMenu = ({
  currentServerUrl,
  isSideBarEnabled,
  isTrayIconEnabled,
  isMenuBarEnabled,
  mainWindowState,
}: RootState): MenuItem => {
  const isServerSelected = !!currentServerUrl;
  const isFullScreenEnabled = mainWindowState.visible;

  return createMenuItem({
    id: 'viewMenu',
    label: t('menus.viewMenu'),
    submenu: Menu.buildFromTemplate([
      createMenuItem({
        id: 'reload',
        label: t('menus.reload'),
        accelerator: 'CommandOrControl+R',
        enabled: isServerSelected,
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.reload();
        },
      }),
      createMenuItem({
        id: 'reloadIgnoringCache',
        label: t('menus.reloadIgnoringCache'),
        enabled: isServerSelected,
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.reloadIgnoringCache();
        },
      }),
      createMenuItem({
        id: 'openDevTools',
        label: t('menus.openDevTools'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.toggleDevTools();
        },
      }),
      separator,
      createMenuItem({
        id: 'back',
        label: t('menus.back'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.goBack();
        },
      }),
      createMenuItem({
        id: 'forward',
        label: t('menus.forward'),
        enabled: isServerSelected,
        accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
        click: () => {
          getRootWindow().show();
          const guestWebContents = getWebContentsByServerUrl(currentServerUrl);
          guestWebContents.goForward();
        },
      }),
      separator,
      createMenuItem({
        id: 'showTrayIcon',
        label: t('menus.showTrayIcon'),
        type: 'checkbox',
        checked: isTrayIconEnabled,
        click: ({ checked }) => {
          dispatch({
            type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
            payload: checked,
          });
        },
      }),
      ...process.platform === 'darwin' ? [
        createMenuItem({
          id: 'showFullScreen',
          label: t('menus.showFullScreen'),
          type: 'checkbox',
          checked: isFullScreenEnabled,
          accelerator: 'Control+Command+F',
          click: ({ checked: enabled }) => {
            getRootWindow().show();
            getRootWindow().setFullScreen(enabled);
          },
        }),
      ] : [],
      ...process.platform !== 'darwin' ? [
        createMenuItem({
          id: 'showMenuBar',
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
        }),
      ] : [],
      createMenuItem({
        id: 'showServerList',
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
      }),
      separator,
      createMenuItem({
        id: 'resetZoom',
        label: t('menus.resetZoom'),
        accelerator: 'CommandOrControl+0',
        click: () => {
          getRootWindow().show();
          getRootWindow().webContents.zoomLevel = 0;
        },
      }),
      createMenuItem({
        id: 'zoomIn',
        label: t('menus.zoomIn'),
        accelerator: 'CommandOrControl+Plus',
        click: () => {
          getRootWindow().show();
          if (getRootWindow().webContents.zoomLevel >= 9) {
            return;
          }
          getRootWindow().webContents.zoomLevel++;
        },
      }),
      createMenuItem({
        id: 'zoomOut',
        label: t('menus.zoomOut'),
        accelerator: 'CommandOrControl+-',
        click: () => {
          getRootWindow().show();
          if (getRootWindow().webContents.zoomLevel <= -9) {
            return;
          }
          getRootWindow().webContents.zoomLevel--;
        },
      }),
    ]),
  });
};

const createWindowMenu = ({
  servers,
  currentServerUrl,
  isShowWindowOnUnreadChangedEnabled,
}: RootState): MenuItem => createMenuItem({
  id: 'windowMenu',
  label: t('menus.windowMenu'),
  role: 'windowMenu',
  submenu: Menu.buildFromTemplate([
    ...process.platform === 'darwin' ? [
      createMenuItem({
        id: 'addNewServer',
        label: t('menus.addNewServer'),
        accelerator: 'CommandOrControl+N',
        click: () => {
          getRootWindow().show();
          dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
        },
      }),
      separator,
    ] : [],
    ...servers.length > 0 ? [
      ...servers.map((server, i) => createMenuItem({
        id: server.url,
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
      separator,
    ] : [],
    createMenuItem({
      id: 'showOnUnreadMessage',
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
    }),
    separator,
    createMenuItem({
      id: 'minimize',
      role: 'minimize',
      label: t('menus.minimize'),
      accelerator: 'CommandOrControl+M',
    }),
    createMenuItem({
      id: 'close',
      role: 'close',
      label: t('menus.close'),
      accelerator: 'CommandOrControl+W',
    }),
  ]),
});

const createHelpMenu = (): MenuItem => createMenuItem({
  id: 'helpMenu',
  label: t('menus.helpMenu'),
  role: 'help',
  submenu: Menu.buildFromTemplate([
    createMenuItem({
      id: 'documentation',
      label: t('menus.documentation'),
      click: () => {
        shell.openExternal('https://rocket.chat/docs');
      },
    }),
    createMenuItem({
      id: 'reportIssue',
      label: t('menus.reportIssue'),
      click: () => {
        shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues/new');
      },
    }),
    separator,
    createMenuItem({
      id: 'reload-window',
      label: t('menus.reload'),
      accelerator: 'CommandOrControl+Shift+R',
      click: () => {
        getRootWindow().show();
        getRootWindow().reload();
      },
    }),
    createMenuItem({
      id: 'toggleDevTools',
      label: t('menus.toggleDevTools'),
      click: () => {
        getRootWindow().show();
        getRootWindow().webContents.toggleDevTools();
      },
    }),
    separator,
    createMenuItem({
      id: 'clearTrustedCertificates',
      label: t('menus.clearTrustedCertificates'),
      click: () => {
        getRootWindow().show();
        dispatch({ type: CERTIFICATES_CLEARED });
        getAllServerWebContents().forEach((webContents) => {
          webContents.reloadIgnoringCache();
        });
      },
    }),
    createMenuItem({
      id: 'resetAppData',
      label: t('menus.resetAppData'),
      click: async () => {
        const permitted = await askForAppDataReset();

        if (permitted) {
          relaunchApp('--reset-app-data');
        }
      },
    }),
    separator,
    createMenuItem({
      id: 'learnMore',
      label: t('menus.learnMore'),
      click: () => {
        shell.openExternal('https://rocket.chat');
      },
    }),
    ...process.platform !== 'darwin' ? [
      createMenuItem({
        id: 'about',
        label: t('menus.about', { appName: app.name }),
        click: () => {
          getRootWindow().show();
          dispatch({ type: MENU_BAR_ABOUT_CLICKED });
        },
      }),
    ] : [],
  ]),
});

export const setupMenuBar = (): void => {
  const selectMenuBarTemplate = createSelector([
    createAppMenu,
    createEditMenu,
    createViewMenu,
    createWindowMenu,
    createHelpMenu,
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
