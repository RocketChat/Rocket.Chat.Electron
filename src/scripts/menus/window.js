import { remote } from 'electron';
import i18n from '../../i18n/index.js';
import webview from '../webview';
import servers from '../servers';
const isMac = process.platform === 'darwin';

const macWindowTemplate = [
    {
        label: i18n.__('Minimize'),
        accelerator: 'Command+M',
        role: 'minimize'
    },
    {
        label: i18n.__('Close'),
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
        label: i18n.__('Add_new_server'),
        accelerator: 'Command+N',
        click: function () {
            const mainWindow = remote.getCurrentWindow();
            mainWindow.show();
            servers.clearActive();
            webview.showLanding();
        }
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Bring_All_to_Front'),
        click: function () {
            const mainWindow = remote.getCurrentWindow();
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
        label: i18n.__('Add_new_server'),
        accelerator: 'Ctrl+N',
        click: function () {
            servers.clearActive();
            webview.showLanding();
        }
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Close'),
        accelerator: 'Ctrl+W',
        click: function () {
            remote.getCurrentWindow().close();
        }
    }
];

export default isMac ? macWindowTemplate : windowTemplate;
