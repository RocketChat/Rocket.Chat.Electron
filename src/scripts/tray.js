'use strict';

import { remote } from 'electron';
import path from 'path';
import i18n from '../i18n/index.js';

const { Tray, Menu } = remote;

const mainWindow = remote.getCurrentWindow();

const icons = {
    win32: {
        dir: 'windows',
        icon0: 'icon-tray-0.png',
        icon1: 'icon-tray-1.png',
        icon2: 'icon-tray-2.png',
        icon3: 'icon-tray-3.png',
        icon4: 'icon-tray-4.png',
        icon5: 'icon-tray-5.png',
        icon6: 'icon-tray-6.png',
        icon7: 'icon-tray-7.png',
        icon8: 'icon-tray-8.png',
        icon9: 'icon-tray-9.png',
        iconAlert: 'icon-tray-alert.png',
        iconDot: 'icon-tray-dot.png',
        iconPlus: 'icon-tray-plus.png'
    },

    linux: {
        dir: 'linux',
        icon0: 'icon-tray-0.png',
        icon1: 'icon-tray-1.png',
        icon2: 'icon-tray-2.png',
        icon3: 'icon-tray-3.png',
        icon4: 'icon-tray-4.png',
        icon5: 'icon-tray-5.png',
        icon6: 'icon-tray-6.png',
        icon7: 'icon-tray-7.png',
        icon8: 'icon-tray-8.png',
        icon9: 'icon-tray-9.png',
        iconAlert: 'icon-tray-alert.png',
        iconDot: 'icon-tray-dot.png',
        iconPlus: 'icon-tray-plus.png'
    },

    darwin: {
        dir: 'osx',
        icon0: 'icon-tray-0.png',
        icon1: 'icon-tray-0.png',
        icon2: 'icon-tray-0.png',
        icon3: 'icon-tray-0.png',
        icon4: 'icon-tray-0.png',
        icon5: 'icon-tray-0.png',
        icon6: 'icon-tray-0.png',
        icon7: 'icon-tray-0.png',
        icon8: 'icon-tray-0.png',
        icon9: 'icon-tray-0.png',
        iconAlert: 'icon-tray-alert.png',
        iconDot: 'icon-tray-alert.png',
        iconPlus: 'icon-tray-alert.png',
        title: {
            online: '\u001B[32m',
            away: '\u001B[33m',
            busy: '\u001B[31m',
            offline: '\u001B[30m'
        }
    }
};

const _iconTray = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].icon0);

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

function getTrayImagePath (badge) {
    let iconName;
    if (badge.title === '•') {
        iconName = "iconDot";
    } else if (!isNaN(parseInt(badge.title))) {
        if (badge.title > 9) {
            iconName = "iconPlus";
        } else {
            iconName = "icon" + badge.count;
        }
    } else if (badge.showAlert) {
        iconName =  "iconAlert";
    } else {
        iconName =  "icon0";
    }

    return path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform][iconName]);
}

function showTrayAlert (badge, status = 'online') {
    if (mainWindow.tray === null || mainWindow.tray === undefined) {
        return;
    }
    mainWindow.tray.setImage(getTrayImagePath(badge));
    mainWindow.flashFrame(badge.showAlert);

    if (process.platform === 'darwin') {
        mainWindow.tray.setTitle(`${icons[process.platform].title[status]} ${badge.title}`);
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
