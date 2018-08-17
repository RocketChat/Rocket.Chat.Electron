import path from 'path';
import url from 'url';
import jetpack from 'fs-jetpack';
import { app, Menu, BrowserWindow } from 'electron';
import './background/certificate';
import { afterMainWindow } from './background.custom';
import i18n from './i18n/index.js';
import env from './env';

export { default as remoteServers } from './background/servers';
export { default as certificate } from './background/certificate';

const unsetDefaultApplicationMenu = () => {
    const isMacOS = process.platform === 'darwin';

    if (isMacOS) {
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

        return;
    }

    Menu.setApplicationMenu(null);
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

const processProtocolArgv = (argv) => {
    const protocolURI = argv.find(arg => arg.startsWith('rocketchat://'));
    if (protocolURI) {
        const site = protocolURI.split(/\/|\?/)[2];
        if (site) {
            let scheme = 'https://';
            if (protocolURI.includes('insecure=true')) {
                scheme = 'http://';
            }
            return scheme + site;
        }
    }
};

let mainWindow = null;
const appIsReady = new Promise(resolve => {
    if (app.isReady()) {
        resolve();
    } else {
        app.on('ready', resolve);
    }
});
if (process.platform === 'darwin') {
    // Open protocol urls on mac as open-url is not yet implemented on other OS's
    app.on('open-url', function (e, url) {
        e.preventDefault();
        const site = processProtocolArgv([url]);
        if (site) {
            appIsReady.then(() => setTimeout(() => mainWindow.send('add-host', site), 750));
        }
    });
} else {
    const isSecondInstance = app.makeSingleInstance((argv) => {
        // Someone tried to run a second instance, we should focus our window.
        const site = processProtocolArgv(argv);
        if (site) {
            appIsReady.then(() => mainWindow.send('add-host', site));
        }
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
        }
    });
    if (isSecondInstance) {
        app.quit();
    }
}

app.on('ready', function () {
    unsetDefaultApplicationMenu();
    setUserDataPath();
    migrateOlderVersionUserData();

    mainWindow = new BrowserWindow({
        width: 1000,
        titleBarStyle: 'hidden',
        height: 600
    });

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

app.on('window-all-closed', function () {
    app.quit();
});
