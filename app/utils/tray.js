import { app, Tray, Menu } from 'electron';
import path from 'path';
import i18n from '../i18n';
import { getWindow } from './window';
import store from './store';

let mainWindow;

const icons = {
  win32: {
    dir: 'windows'
  },

  linux: {
    dir: 'linux'
  },

  darwin: {
    dir: 'osx',
    icon: 'icon-trayTemplate.png'
  }
};

const { dir, icon = 'icon-tray.png', iconAlert = 'icon-tray-alert.png' } = icons[process.platform];

const _iconTray = path.join(__dirname, '../images', dir, icon);
const _iconTrayAlert = path.join(__dirname, '../images', dir, iconAlert);

function createAppTray() {
  const _tray = new Tray(_iconTray);
  mainWindow.tray = _tray;

  const contextMenuShow = Menu.buildFromTemplate([{
    label: i18n.__('Show'),
    click: () => mainWindow.show()
  }, {
    label: i18n.__('Quit'),
    click: () => app.quit()
  }]);

  const contextMenuHide = Menu.buildFromTemplate([{
    label: i18n.__('Hide'),
    click: () => mainWindow.hide()
  }, {
    label: i18n.__('Quit'),
    click: () => app.quit()
  }]);

  if (!mainWindow.isMinimized() && !mainWindow.isVisible()) {
    _tray.setContextMenu(contextMenuShow);
  } else {
    _tray.setContextMenu(contextMenuHide);
  }

  const onShow = () => _tray.setContextMenu(contextMenuHide);

  const onHide = () => _tray.setContextMenu(contextMenuShow);

  mainWindow.on('show', onShow);
  mainWindow.on('hide', onHide);

  _tray.setToolTip(app.getName());

  _tray.on('right-click', (e, b) => _tray.popUpContextMenu(undefined, b));

  _tray.on('click', () => {
    mainWindow.show();
  });

  mainWindow.destroyTray = () => {
    mainWindow.removeListener('show', onShow);
    mainWindow.removeListener('hide', onHide);
    _tray.destroy();
  };
}

function setImage(title) {
  let iconName = title;
  if (title === '•') {
    iconName = 'Dot';
  } else if (!isNaN(parseInt(title, 10)) && title > 9) {
    iconName = '9Plus';
  }

  const _iconPath = path.join(__dirname, 'images', icons[process.platform].dir, `icon-tray${iconName}.png`);
  mainWindow.tray.setImage(_iconPath);
}

function showTrayAlert(showAlert, title) {
  if (mainWindow.tray === null || mainWindow.tray === undefined) {
    return;
  }

  mainWindow.flashFrame(showAlert);
  if (process.platform !== 'darwin') {
    setImage(title);
  } else {
    if (showAlert) {
      mainWindow.tray.setImage(_iconTrayAlert);
    } else {
      mainWindow.tray.setImage(_iconTray);
    }
    mainWindow.tray.setTitle(title);
  }
}

function removeAppTray() {
  mainWindow.destroyTray();
}

function toggleTray() {
  const hideTray = !store.get('hideTray', false);
  if (hideTray) {
    removeAppTray();
  } else {
    createAppTray();
  }
  store.set('hideTray', hideTray);
}

function initTray() {
  console.log('initTray')
  mainWindow = getWindow('main');
  if (!store.get('hideTray', false)) {
    console.log('crreating')
    createAppTray();
  }
}

export default {
  showTrayAlert,
  toggleTray,
  initTray
};
