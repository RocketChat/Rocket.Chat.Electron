import { app, BrowserWindow } from 'electron';
import i18n from '../i18n/index.js';

export const devMenuTemplate = {
    label: i18n.__('Development'),
    submenu: [{
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function () {
            BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
        }
    }, {
        label: i18n.__('Toggle_DevTools'),
        accelerator: 'Alt+CmdOrCtrl+I',
        click: function () {
            BrowserWindow.getFocusedWindow().toggleDevTools();
        }
    }, {
        label: i18n.__('Quit'),
        accelerator: 'CmdOrCtrl+Q',
        click: function () {
            app.quit();
        }
    }]
};
