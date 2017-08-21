import { remote } from 'electron';
import servers from '../servers';
const APP_NAME = remote.app.getName();

const helpTemplate = [
    {
        label: APP_NAME + ' Help',
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
        label: 'Learn More',
        click: () => remote.shell.openExternal('https://rocket.chat')

    }
];

export default helpTemplate;
