import path from 'path';
import querystring from 'querystring';
import url from 'url';
import jetpack from 'fs-jetpack';
import { app, Menu } from 'electron';
import './background/certificate';
import { getMainWindow, afterMainWindow } from './background.custom';
import i18n from './i18n/index.js';
import env from './env';

export { default as remoteServers } from './background/servers';
export { default as certificate } from './background/certificate';

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

const addServers = (serverUrls) => {
    getMainWindow().then((mainWindow) => {
        serverUrls.forEach(serverUrl => mainWindow.send('add-host', serverUrl));

        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.show();
    });
};

const isSecondInstance = app.makeSingleInstance((argv) => {
    addServers(parseProtocolUrls(argv.slice(2)));
});

if (isSecondInstance) {
    app.quit();
}

// macOS only
app.on('open-url', (event, url) => {
    event.preventDefault();
    addServers(parseProtocolUrls([ url ]));
});

app.on('ready', () => {
    unsetDefaultApplicationMenu();
    setUserDataPath();
    migrateOlderVersionUserData();

    if (!app.isDefaultProtocolClient('rocketchat')) {
        app.setAsDefaultProtocolClient('rocketchat');
    }

    getMainWindow().then((mainWindow) => {
        afterMainWindow(mainWindow);

        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'public', 'app.html'),
            protocol: 'file:',
            slashes: true
        }));

        if (env.name === 'development') {
            mainWindow.openDevTools();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
