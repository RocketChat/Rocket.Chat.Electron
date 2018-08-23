import path from 'path';
import querystring from 'querystring';
import url from 'url';
import jetpack from 'fs-jetpack';
import idle from '@paulcbetts/system-idle-time';
import { app, ipcMain, Menu } from 'electron';

import autoUpdate from './background/autoUpdate';
import certificate from './background/certificate';
import { addServer, createMainWindow, getMainWindow } from './background/mainWindow';
import './background/screenshare';

import i18n from './i18n/index.js';
import env from './env';

export { default as remoteServers } from './background/servers';
export { default as certificate } from './background/certificate';

process.env.GOOGLE_API_KEY = 'AIzaSyADqUh_c1Qhji3Cp1NE43YrcpuPkmhXD-c';

const isMacOS = process.platform === 'darwin';

const unsetDefaultApplicationMenu = () => {
    if (!isMacOS) {
        Menu.setApplicationMenu(null);
        return;
    }

    const emptyMenuTemplate = [{
        submenu: [
            {
                label: i18n.__('Quit_App', app.getName()),
                accelerator: 'CommandOrControl+Q',
                click () {
                    app.quit();
                }
            }
        ]
    }];
    Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

const setUserDataPath = () => {
    const appName = app.getName();
    const dirName = env.name === 'production' ? appName : `${ appName } (${ env.name })`;

    app.setPath('userData', path.join(app.getPath('appData'), dirName));
};

const migrateOlderVersionUserData = () => {
    const olderAppName = 'Rocket.Chat+';
    const dirName = env.name === 'production' ? olderAppName : `${ olderAppName } (${ env.name })`;
    const olderUserDataPath = path.join(app.getPath('appData'), dirName);

    try {
        jetpack.copy(olderUserDataPath, app.getPath('userData'), { overwrite: true });
        jetpack.remove(olderUserDataPath);
    } catch (e) {
        return;
    }
};

const parseProtocolUrls = (args) =>
    args.filter(arg => /^rocketchat:\/\/./.test(arg))
        .map(uri => url.parse(uri))
        .map(({ hostname, pathname, query }) => {
            const { insecure } = querystring.parse(query);
            return `${ insecure === 'true' ? 'http' : 'https' }://${ hostname }${ pathname || '' }`;
        });

const addServers = (protocolUrls) => parseProtocolUrls(protocolUrls)
    .forEach(serverUrl => addServer(serverUrl));

const isSecondInstance = app.makeSingleInstance((argv) => {
    addServers(argv.slice(2));
});

if (isSecondInstance) {
    app.quit();
}

// macOS only
app.on('open-url', (event, url) => {
    event.preventDefault();
    addServers([ url ]);
});

app.on('ready', () => {
    unsetDefaultApplicationMenu();
    setUserDataPath();
    migrateOlderVersionUserData();

    if (!app.isDefaultProtocolClient('rocketchat')) {
        app.setAsDefaultProtocolClient('rocketchat');
    }

    createMainWindow();

    getMainWindow().then(mainWindow => certificate.initWindow(mainWindow));

    autoUpdate();
});

app.on('window-all-closed', () => {
    app.quit();
});

ipcMain.on('getSystemIdleTime', (event) => {
    event.returnValue = idle.getIdleTime();
});
