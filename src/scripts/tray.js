'use strict';

import { remote } from 'electron';
import path from 'path';
import i18n from '../i18n/index.js';

const { Tray, Menu } = remote;

const mainWindow = remote.getCurrentWindow();

const icons = {
    win32: {
        dir: 'windows'
    },

    linux: {
        dir: 'linux'
    },

    darwin: {
        dir: 'osx',
        icon: 'icon-trayTemplate.png',
        iconAlert: 'icon-tray-alert.png',
        title: {
            online: '\u001B[32m',
            away: '\u001B[33m',
            busy: '\u001B[31m',
            offline: '\u001B[30m'
        }
    }
};

const _iconTray = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].icon || 'icon-tray.png');

function createAppTray () {
    const _tray = new Tray(_iconTray);
    mainWindow.tray = _tray;

    const contextMenuShow = Menu.buildFromTemplate([{
        label: i18n.__('Show'),
        click () {
            mainWindow.show();
        }
    }, {
        label: i18n.__('Quit'),
        click () {
            remote.app.quit();
        }
    }]);

    const contextMenuHide = Menu.buildFromTemplate([{
        label: i18n.__('Hide'),
        click () {
            mainWindow.hide();
        }
    }, {
        label: i18n.__('Quit'),
        click () {
            remote.app.quit();
        }
    }]);

    if (!mainWindow.isMinimized() && !mainWindow.isVisible()) {
        _tray.setContextMenu(contextMenuShow);
    } else {
        _tray.setContextMenu(contextMenuHide);
    }

    const onShow = function () {
        _tray.setContextMenu(contextMenuHide);
    };

    const onHide = function () {
        _tray.setContextMenu(contextMenuShow);
    };

    mainWindow.on('show', onShow);
    mainWindow.on('restore', onShow);

    mainWindow.on('hide', onHide);
    mainWindow.on('minimize', onHide);

    _tray.setToolTip(remote.app.getName());

    _tray.on('right-click', function (e, b) {
        _tray.popUpContextMenu(undefined, b);
    });

    _tray.on('click', () => {
        if (mainWindow.isVisible()) {
            return mainWindow.hide();
        }

        mainWindow.show();
    });

    mainWindow.destroyTray = function () {
        mainWindow.removeListener('show', onShow);
        mainWindow.removeListener('hide', onHide);
        _tray.destroy();
    };
}

function getImageTitle (title) {
    if (title === '•') {
        return "Dot";
    } else if (!isNaN(parseInt(title)) && title > 9) {
        return "9Plus";
    }
}

function getTrayIcon (platform, showAlert, title, status) {
    if (platform !== 'darwin') {
        return path.join(__dirname, 'images', icons[process.platform].dir, `icon-tray${title}-${status}.png`);
    }

    if (showAlert) {
        return path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconAlert ||`icon-tray-alert-${status}Template.png`);
    } else {
        return path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].icon ||`icon-tray-${status}Template.png`);
    }
}

function showTrayAlert (showAlert, title, status = 'online') {
    if (mainWindow.tray === null || mainWindow.tray === undefined) {
        return;
    }

    mainWindow.flashFrame(showAlert, title);
    const trayImagePath = getTrayIcon(process.platform, showAlert, getImageTitle(title), status);
    mainWindow.tray.setImage(trayImagePath);

    if (process.platform === 'darwin') {
        mainWindow.tray.setTitle(`${icons[process.platform].title[status]}${title}`);
    }
}

function removeAppTray () {
    mainWindow.destroyTray();
}

function toggle () {
    if (localStorage.getItem('hideTray') === 'true') {
        createAppTray();
        localStorage.setItem('hideTray', 'false');
    } else {
        removeAppTray();
        localStorage.setItem('hideTray', 'true');
    }
}

if (localStorage.getItem('hideTray') !== 'true') {
    createAppTray();
}

export default {
    showTrayAlert,
    toggle
};
