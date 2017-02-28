'use strict';

import { remote } from 'electron';
import path from 'path';

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
        icon: 'icon-trayTemplate.png'
    }
};

const _iconTray = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].icon || 'icon-tray.png');
const _iconTrayAlert = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconAlert || 'icon-tray-alert.png');
const _iconTrayTitleDot = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitleDot || 'title/icon-tray-title-dot.png');
const _iconTrayTitle1 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle1 || 'title/icon-tray-title-1.png');
const _iconTrayTitle2 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle2 || 'title/icon-tray-title-2.png');
const _iconTrayTitle3 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle3 || 'title/icon-tray-title-3.png');
const _iconTrayTitle4 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle4 || 'title/icon-tray-title-4.png');
const _iconTrayTitle5 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle5 || 'title/icon-tray-title-5.png');
const _iconTrayTitle6 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle6 || 'title/icon-tray-title-6.png');
const _iconTrayTitle7 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle7 || 'title/icon-tray-title-7.png');
const _iconTrayTitle8 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle8 || 'title/icon-tray-title-8.png');
const _iconTrayTitle9 = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle9 || 'title/icon-tray-title-9.png');
const _iconTrayTitle9Plus = path.join(__dirname, 'images', icons[process.platform].dir, icons[process.platform].iconTrayTitle9Plus || 'title/icon-tray-title-9-plus.png');

function createAppTray () {
    const _tray = new Tray(_iconTray);
    mainWindow.tray = _tray;

    const contextMenuShow = Menu.buildFromTemplate([{
        label: 'Show',
        click () {
            mainWindow.show();
        }
    }, {
        label: 'Quit',
        click () {
            remote.app.quit();
        }
    }]);

    const contextMenuHide = Menu.buildFromTemplate([{
        label: 'Hide',
        click () {
            mainWindow.hide();
        }
    }, {
        label: 'Quit',
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
    mainWindow.on('hide', onHide);

    _tray.setToolTip(remote.app.getName());

    _tray.on('right-click', function (e, b) {
        _tray.popUpContextMenu(undefined, b);
    });

    _tray.on('click', () => {
        mainWindow.show();
});

    mainWindow.destroyTray = function () {
        mainWindow.removeListener('show', onShow);
        mainWindow.removeListener('hide', onHide);
        _tray.destroy();
    };
}

function setTitle (title) {
    switch (title) {
        case "":
            mainWindow.tray.setImage(_iconTray);
            break;
        case "•":
            mainWindow.tray.setImage(_iconTrayTitleDot);
            break;
        case "1":
            mainWindow.tray.setImage(_iconTrayTitle1);
            break;
        case "2":
            mainWindow.tray.setImage(_iconTrayTitle2);
            break;
        case "3":
            mainWindow.tray.setImage(_iconTrayTitle3);
            break;
        case "4":
            mainWindow.tray.setImage(_iconTrayTitle4);
            break;
        case "5":
            mainWindow.tray.setImage(_iconTrayTitle5);
            break;
        case "6":
            mainWindow.tray.setImage(_iconTrayTitle6);
            break;
        case "7":
            mainWindow.tray.setImage(_iconTrayTitle7);
            break;
        case "8":
            mainWindow.tray.setImage(_iconTrayTitle8);
            break;
        case "9":
            mainWindow.tray.setImage(_iconTrayTitle9);
            break;
        default:
            mainWindow.tray.setImage(_iconTrayTitle9Plus);
    }
}

function showTrayAlert (showAlert, title) {
    if (mainWindow.tray === null || mainWindow.tray === undefined) {
        return;
    }

    mainWindow.flashFrame(showAlert);
    if (process.platform !== 'darwin') {
        setTitle(title);
    } else {
        if (showAlert) {
            mainWindow.tray.setImage(_iconTrayAlert);
        } else {
            mainWindow.tray.setImage(_iconTray);
        }
        mainWindow.tray.setTitle(title);
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

function setTitle(title) {
    switch(title){
        case "":
            mainWindow.tray.setImage(_iconTray);
            break;
        case "•":
            mainWindow.tray.setImage(_iconTrayTitleDot);
            break;
        case "1":
            mainWindow.tray.setImage(_iconTrayTitle1);
            break;
        case "2":
            mainWindow.tray.setImage(_iconTrayTitle2);
            break;
        case "3":
            mainWindow.tray.setImage(_iconTrayTitle3);
            break;
        case "4":
            mainWindow.tray.setImage(_iconTrayTitle4);
            break;
        case "5":
            mainWindow.tray.setImage(_iconTrayTitle5);
            break;
        case "6":
            mainWindow.tray.setImage(_iconTrayTitle6);
            break;
        case "7":
            mainWindow.tray.setImage(_iconTrayTitle7);
            break;
        case "8":
            mainWindow.tray.setImage(_iconTrayTitle8);
            break;
        case "9":
            mainWindow.tray.setImage(_iconTrayTitle9);
            break;
        default:
            mainWindow.tray.setImage(_iconTrayTitle9Plus);
    }
}

if (localStorage.getItem('hideTray') !== 'true') {
    createAppTray();
}

export default {
    showTrayAlert,
    toggle
};
