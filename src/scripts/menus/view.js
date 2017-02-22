import { remote } from 'electron';
import webview from '../webview';
import sidebar from '../sidebar';
import tray from '../tray';

const isMac = process.platform === 'darwin';
const certificate = remote.require('./background').certificate;

const viewTemplate = [
    {
        label: 'Original Zoom',
        accelerator: 'CommandOrControl+0',
        role: 'resetzoom'
    },
    {
        label: 'Zoom In',
        accelerator: 'CommandOrControl+Plus',
        role: 'zoomin'
    },
    {
        label: 'Zoom Out',
        accelerator: 'CommandOrControl+-',
        role: 'zoomout'
    },
    {
        type: 'separator'
    },
    {
        label: 'Current Server - Reload',
        accelerator: 'CommandOrControl+R',
        click: function () {
            const activeWebview = webview.getActive();
            if (activeWebview) {
                activeWebview.reload();
            }
        }
    },
    {
        label: 'Current Server - Toggle DevTools',
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
        label: 'Application - Reload',
        accelerator: 'CommandOrControl+Shift+R',
        click: function () {
            var mainWindow = remote.getCurrentWindow();
            if (mainWindow.destroyTray) {
                mainWindow.destroyTray();
            }
            mainWindow.reload();
        }
    },
    {
        label: 'Application - Toggle DevTools',
        click: function () {
            remote.getCurrentWindow().toggleDevTools();
        }
    },
    {
        type: 'separator',
        id: 'toggle'
    },
    {
        label: 'Toggle Server List',
        click: function () {
            sidebar.toggle();
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Clear',
        submenu: [
            {
                label: 'Clear Trusted Certificates',
                click: function () {
                    certificate.clear();
                }
            }
        ]
    }
];

if (isMac) {
    viewTemplate.push({
        label: 'Toggle Tray Icon',
        click: function () {
            tray.toggle();
        },
        position: 'after=toggle'
    });
} else {
    viewTemplate.push({
        label: 'Toggle Menu Bar',
        click: function () {
            const current = localStorage.getItem('autohideMenu') === 'true';
            remote.getCurrentWindow().setAutoHideMenuBar(!current);
            localStorage.setItem('autohideMenu', JSON.stringify(!current));
        },
        position: 'after=toggle'
    });
}

export default viewTemplate;
