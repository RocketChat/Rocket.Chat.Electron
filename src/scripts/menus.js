'use strict';

import { remote } from 'electron';
import { servers } from './servers';
import { sidebar } from './sidebar';
import { webview } from './webview';
import tray from './tray';
import '../branding/branding.js';

const Menu = remote.Menu;
const APP_NAME = remote.app.getName();
const isMac = process.platform === 'darwin';

const certificate = remote.require('./background').certificate;

document.title = APP_NAME;

const macAppTemplate = [
    {
        label: 'About ' + APP_NAME,
        role: 'about'
    },
    {
        type: 'separator'
    },
    {
        label: 'Hide ' + APP_NAME,
        accelerator: 'Command+H',
        role: 'hide'
    },
    {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
    },
    {
        label: 'Show All',
        role: 'unhide'
    },
    {
        type: 'separator'
    },
    {
        label: 'Quit ' + APP_NAME,
        accelerator: 'Command+Q',
        click: function () {
            remote.app.quit();
        }
    }
];

const appTemplate = [
    {
        label: 'About ' + APP_NAME,
        click: function () {
            const win = new remote.BrowserWindow({ width: 310, height: 200, minWidth: 310, minHeight: 200, maxWidth: 310, maxHeight: 200, show: false, maximizable: false, minimizable: false, title: ' ' });
            win.loadURL('file://' + __dirname + '/about.html');
            win.show();
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Quit',
        accelerator: 'Ctrl+Q',
        click: function () {
            remote.app.quit();
        }
    }
];

const editTemplate = [
    {
        label: 'Undo',
        accelerator: 'CommandOrControl+Z',
        role: 'undo'
    },
    {
        label: 'Redo',
        accelerator: 'CommandOrControl+Shift+Z',
        role: 'redo'
    },
    {
        type: 'separator'
    },
    {
        label: 'Cut',
        accelerator: 'CommandOrControl+X',
        role: 'cut'
    },
    {
        label: 'Copy',
        accelerator: 'CommandOrControl+C',
        role: 'copy'
    },
    {
        label: 'Paste',
        accelerator: 'CommandOrControl+V',
        role: 'paste'
    },
    {
        label: 'Select All',
        accelerator: 'CommandOrControl+A',
        role: 'selectall'
    }
];

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

const macWindowTemplate = [
    {
        label: 'Minimize',
        accelerator: 'Command+M',
        role: 'minimize'
    },
    {
        label: 'Close',
        accelerator: 'Command+W',
        role: 'close'
    },
    {
        type: 'separator'
    },
    {
        type: 'separator',
        id: 'server-list-separator',
        visible: false
    },
    {
        label: 'Add new server',
        accelerator: 'Command+N',
        click: function () {
            var mainWindow = remote.getCurrentWindow();
            mainWindow.show();
            servers.clearActive();
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Bring All to Front',
        click: function () {
            var mainWindow = remote.getCurrentWindow();
            mainWindow.show();
        }
    }
];

const windowTemplate = [
    {
        type: 'separator',
        id: 'server-list-separator',
        visible: false
    },
    {
        label: 'Add new server',
        accelerator: 'Ctrl+N',
        click: function () {
            servers.clearActive();
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Close',
        accelerator: 'Ctrl+W',
        click: function () {
            remote.getCurrentWindow().close();
        }
    }
];

const helpTemplate = [
    {
        label: APP_NAME + ' Help',
        click: function () {
            remote.shell.openExternal('https://rocket.chat/docs');
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Learn More',
        click: function () {
            remote.shell.openExternal('https://rocket.chat');
        }
    }
];

const defaultTemplate = [
    {
        label: `&${APP_NAME}`,
        submenu: appTemplate
    },
    {
        label: '&Edit',
        submenu: editTemplate
    },
    {
        label: '&View',
        submenu: viewTemplate
    },
    {
        label: '&Window',
        id: 'window',
        submenu: windowTemplate
    }
];

const macTemplate = [
    {
        label: APP_NAME,
        submenu: macAppTemplate
    },
    {
        label: 'Edit',
        submenu: editTemplate
    },
    {
        label: 'View',
        submenu: viewTemplate
    },
    {
        label: 'Window',
        id: 'window',
        role: 'window',
        submenu: macWindowTemplate
    },
    {
        label: 'Help',
        role: 'help',
        submenu: helpTemplate
    }
];

const template = isMac ? macTemplate : defaultTemplate;

export var menuTemplate = template;
export var menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);

if (!isMac) {
    if (localStorage.getItem('autohideMenu') === 'true') {
        remote.getCurrentWindow().setAutoHideMenuBar(true);
    }
}
