// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import os from 'os';
import { app, ipcMain, BrowserWindow } from 'electron';
import windowStateKeeper from './background/windowState';
import certificate from './background/certificate';
import Toaster from './Toaster';
import idle from '@paulcbetts/system-idle-time';
import { checkForUpdates } from './background/autoUpdate';

process.env.GOOGLE_API_KEY = 'AIzaSyADqUh_c1Qhji3Cp1NE43YrcpuPkmhXD-c';

let screenshareEvent;
ipcMain.on('screenshare', (event, sources) => {
    screenshareEvent = event;
    let window = new BrowserWindow({
        width: 776,
        height: 600,
        show : false,
        skipTaskbar: false
    });

    window.loadURL('file://'+__dirname+'/public/screenshare.html');

    //window.openDevTools();
    window.webContents.on('did-finish-load', () => {
        window.webContents.send('sources', sources);
        window.show();
    });

    window.on('closed', () => {
        window = null;
        if (screenshareEvent) {
            screenshareEvent.sender.send('screenshare-result', 'PermissionDeniedError');
            screenshareEvent = null;
        }
    });
});

ipcMain.on('source-result', (e, sourceId) => {
    if (screenshareEvent) {
        screenshareEvent.sender.send('screenshare-result', sourceId);
        screenshareEvent = null;
    }
});

export function afterMainWindow (mainWindow) {
    if (process.platform !== 'darwin') {
        var shouldQuit = app.makeSingleInstance(function () {
            // Someone tried to run a second instance, we should focus our window.
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });

        if (shouldQuit) {
            app.quit();
        }
    }

    // Preserver of the window size and position between app launches.
    var mainWindowState = windowStateKeeper('main', {
        width: 1000,
        height: 600
    });

    if (mainWindowState.x !== undefined && mainWindowState.y !== undefined) {
        mainWindow.setPosition(mainWindowState.x, mainWindowState.y, false);
    }
    if (mainWindowState.width !== undefined && mainWindowState.height !== undefined) {
        mainWindow.setSize(mainWindowState.width, mainWindowState.height, false);
    }
    mainWindow.setMinimumSize(600, 400);

    if (mainWindowState.isMaximized) {
        mainWindow.maximize();
    }

    if (mainWindowState.isMinimized) {
        mainWindow.minimize();
    }

    if (mainWindowState.isHidden) {
        mainWindow.hide();
    }

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

    app.on('before-quit', function () {
        mainWindowState.saveState(mainWindow);
        mainWindow.forceClose = true;
    });

    mainWindow.on('resize', function () {
        mainWindowState.saveState(mainWindow);
    });

    mainWindow.on('move', function () {
        mainWindowState.saveState(mainWindow);
    });

    app.on('activate', function () {
        mainWindow.show();
    });

    mainWindow.webContents.on('will-navigate', function (event) {
        event.preventDefault();
    });

    ipcMain.on('focus', () => mainWindow.show());

    ipcMain.on('getSystemIdleTime', (event) => {
        event.returnValue = idle.getIdleTime();
    });

    // Windows 7 and below
    const useToaster = ['win32', 'win64'].indexOf(os.platform()) !== -1 &&
      parseFloat(os.release()) < 6.2;

    if (useToaster) {
        const toaster = new Toaster(mainWindow);

        ipcMain.on('notification-shim', (e, title, options) => {
            toaster.toast({
                title: title,
                message: options.body,
                icon: options.icon,
                tag: options.tag,
                width: 400,
                timeout: 5000,
                htmlFile: 'file://'+__dirname+'/public/notification.html'
            }, () => e.sender.send(`clicked-${options.tag}`));
        });
    }

    certificate.initWindow(mainWindow);

    checkForUpdates();
}
