import { remote } from 'electron';
const APP_NAME = remote.app.getName();

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

export default helpTemplate;
