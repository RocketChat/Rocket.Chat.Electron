'use strict';

const { remote } = require('electron');
const { setupScreenSharingForWindow, RemoteControl } = require("jitsi-meet-electron-utils");

const selfBrowserWindow = remote.getCurrentWindow();

// selfBrowserWindow.webContents.openDevTools({ mode: 'detach' });
selfBrowserWindow.webContents.once('dom-ready', () => {
    setupScreenSharingForWindow(window, true);
    new RemoteControl(window, true);
});