import { remote } from 'electron';
import i18n from '../../i18n/index.js';
import webview from '../webview';
import sidebar from '../sidebar';
import tray from '../tray';

const isMac = process.platform === 'darwin';
const certificate = remote.require('./background').certificate;

const viewTemplate = [
    {
        label: i18n.__('Original_Zoom'),
        accelerator: 'CommandOrControl+0',
        role: 'resetzoom'
    },
    {
        label: i18n.__('Zoom_In'),
        accelerator: 'CommandOrControl+Plus',
        role: 'zoomin'
    },
    {
        label: i18n.__('Zoom_Out'),
        accelerator: 'CommandOrControl+-',
        role: 'zoomout'
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Current_Server_Reload'),
        accelerator: 'CommandOrControl+R',
        click: function () {
            const activeWebview = webview.getActive();
            if (activeWebview) {
                activeWebview.reload();
            }
        }
    },
    {
        label: i18n.__('Current_Server_Toggle_DevTools'),
        accelerator: isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I',
        click: function () {
            const activeWebview = webview.getActive();
            if (activeWebview) {
                activeWebview.openDevTools();
            }
        }
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Application_Reload'),
        accelerator: 'CommandOrControl+Shift+R',
        click: function () {
            const mainWindow = remote.getCurrentWindow();
            if (mainWindow.destroyTray) {
                mainWindow.destroyTray();
            }
            mainWindow.reload();
        }
    },
    {
        label: i18n.__('Application_Toggle_DevTools'),
        click: function () {
            remote.getCurrentWindow().toggleDevTools();
        }
    },
    {
        type: 'separator',
        id: 'toggle'
    },
    {
        label: i18n.__('Toggle_Server_List'),
        click: function () {
            sidebar.toggle();
        }
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Clear'),
        submenu: [
            {
                label: i18n.__('Clear_Trusted_Certificates'),
                click: function () {
                    certificate.clear();
                }
            }
        ]
    }
];

if (isMac) {
    viewTemplate.push({
        label: i18n.__('Toggle_Tray_Icon'),
        click: function () {
            tray.toggle();
        },
        position: 'after=toggle'
    });
} else {
    viewTemplate.push({
        label: i18n.__('Toggle_Menu_Bar'),
        click: function () {
            const current = localStorage.getItem('autohideMenu') === 'true';
            remote.getCurrentWindow().setAutoHideMenuBar(!current);
            localStorage.setItem('autohideMenu', JSON.stringify(!current));
        },
        position: 'after=toggle'
    });
}

export default viewTemplate;
