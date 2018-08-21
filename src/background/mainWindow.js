// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import url from 'url';
import path from 'path';
import windowStateKeeper from './windowState';
import certificate from './certificate';
import idle from '@paulcbetts/system-idle-time';
import { canUpdate, checkForUpdates } from './autoUpdate';
import env from '../env';

let mainWindow = null;

function afterMainWindow (mainWindow) {
    // Preserver of the window size and position between app launches.
    const mainWindowState = windowStateKeeper('main', {
        width: 1000,
        height: 600
    });

    if (mainWindowState.x !== undefined && mainWindowState.y !== undefined) {
        mainWindow.setPosition(mainWindowState.x, mainWindowState.y, false);
    }
    if (mainWindowState.width !== undefined && mainWindowState.height !== undefined) {
        mainWindow.setSize(mainWindowState.width, mainWindowState.height, false);
    }

    if (mainWindowState.isMaximized) {
        mainWindow.maximize();
    }

    if (mainWindowState.isMinimized) {
        mainWindow.minimize();
    }

    if (mainWindowState.isHidden) {
        mainWindow.hide();
    }

    app.on('activate', () => {
        mainWindowState.saveState(mainWindow);
        mainWindow.show();
    });

    app.on('before-quit', () => {
        mainWindowState.saveState(mainWindow);
        mainWindow.forceClose = true;
    });

    mainWindow.on('show', () => {
        mainWindowState.saveState(mainWindow);
    });

    mainWindow.on('close', function (event) {
        if (mainWindow.forceClose) {
            mainWindowState.saveState(mainWindow);
            return;
        }
        event.preventDefault();
        if (mainWindow.isFullScreen()) {
            mainWindow.once('leave-full-screen', () => {
                mainWindow.hide();
            });
            mainWindow.setFullScreen(false);
        } else {
            mainWindow.hide();
        }
        mainWindowState.saveState(mainWindow);
    });

    mainWindow.on('resize', function () {
        mainWindowState.saveState(mainWindow);
    });

    mainWindow.on('move', function () {
        mainWindowState.saveState(mainWindow);
    });

    mainWindow.webContents.on('will-navigate', function (event) {
        event.preventDefault();
    });

    ipcMain.on('focus', () => {
        mainWindow.show();
        mainWindowState.saveState(mainWindow);
    });

    ipcMain.on('getSystemIdleTime', (event) => {
        event.returnValue = idle.getIdleTime();
    });

    ipcMain.on('update-taskbar-icon', (event, data, text) => {
        const img = nativeImage.createFromDataURL(data);
        mainWindow.setOverlayIcon(img, text);
    });

    certificate.initWindow(mainWindow);

    if (canUpdate()) {
        checkForUpdates();
    }
}

export const createMainWindow = (cb) => {
    if (mainWindow) {
        return cb && cb(mainWindow);
    }

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        titleBarStyle: 'hidden'
    });

    afterMainWindow(mainWindow);

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public', 'app.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (env.name === 'development') {
        mainWindow.openDevTools();
    }

    return cb && cb(mainWindow);
};

export const getMainWindow = () => new Promise((resolve) => {
    if (app.isReady()) {
        return createMainWindow(resolve);
    }

    app.on('ready', () => createMainWindow(resolve));
});
