import { remote } from 'electron';

const APP_NAME = remote.app.getName();
const isMac = process.platform === 'darwin';

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

export default isMac ? macAppTemplate : appTemplate;
