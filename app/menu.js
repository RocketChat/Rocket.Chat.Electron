// @flow
import { app, Menu, shell, BrowserWindow } from 'electron';
import { getState, subscribe } from './store/mainStore';
import i18n from './i18n';
import appMenu from './menu/app';
import editMenu from './menu/edit';
import viewMenu from './menu/view';
import windowMenu from './menu/window';
import helpMenu from './menu/help';
import { initTray } from './utils/tray';

const APP_NAME = app.getName();

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.servers = getState().servers;
    subscribe(() => {
      // Only rebuild menu if number of servers has changed
      if (getState().servers.length !== this.servers.length) {
        this.buildMenu();
      }
    });
    initTray();
  }

  buildMenu() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment();
    }

    const template = MenuBuilder.getTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.openDevTools();
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu
        .buildFromTemplate([{
          label: 'Inspect element',
          click: () => {
            this.mainWindow.inspectElement(x, y);
          }
        }])
        .popup(this.mainWindow);
    });
  }

  static getLabel(label) {
    return process.platform === 'darwin' ? label : `&${label}`;
  }

  static getTemplate() {
    const menuTemplate = [
      {
        label: MenuBuilder.getLabel(APP_NAME),
        submenu: appMenu
      },
      {
        label: MenuBuilder.getLabel(i18n.__('Edit')),
        submenu: editMenu
      },
      {
        label: MenuBuilder.getLabel(i18n.__('View')),
        submenu: viewMenu()
      },
      {
        id: 'window',
        role: 'window',
        submenu: windowMenu()
      },
      {
        label: i18n.__('Help'),
        role: 'help',
        submenu: helpMenu
      }
    ];
    return menuTemplate;
  }
}
