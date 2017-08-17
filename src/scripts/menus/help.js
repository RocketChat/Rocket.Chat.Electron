import { remote } from 'electron';
import servers from '../servers';
import i18n from '../../i18n/index.js';
const APP_NAME = remote.app.getName();

const helpTemplate = [
    {
        label: i18n.__('Help_Name', APP_NAME),
        click: () => remote.shell.openExternal('https://rocket.chat/docs')
    },
    {
        type: 'separator'
    },
    {
        label: 'Report Issue',
        click: () => remote.shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues')
    },
    {
        label: 'Reset App Data',
        click: () => servers.resetAppData()
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Learn_More'),
        click: () => remote.shell.openExternal('https://rocket.chat')
    }
];

export default helpTemplate;
