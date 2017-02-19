import { remote } from 'electron';
import servers from '../servers';
const isMac = process.platform === 'darwin';

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

export default isMac ? macWindowTemplate : windowTemplate;
