// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from 'path';
import url from 'url';
import { app, Menu } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';
import './background/certificate';

export { default as remoteServers } from './background/servers';
export { default as certificate } from './background/certificate';
import { afterMainWindow } from './background.custom';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

const setApplicationMenu = function () {
    const menus = [editMenuTemplate];
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    const userDataPath = app.getPath('userData');
    app.setPath('userData', userDataPath + ' (' + env.name + ')');
}

const processProtocolURI = (uri) => {
    if (uri && uri.startsWith('rocketchat://')) {
        const site = uri.split(/\/|\?/)[2];
        if (site) {
            let scheme = 'https://';
            if (uri.includes('insecure=true')) {
                scheme = 'http://';
            }
            return scheme + site;
        }
    }
};
const processProtocolArgv = (argv) => {
    const protocolURI = argv.find(arg => arg.startsWith('rocketchat://'));
    if (protocolURI) {
        return processProtocolURI(protocolURI);
    }
};

let mainWindow = null;
const appIsReady = new Promise(resolve => {
    if (app.isReady()) {
        console.log('appisready');

        resolve();
    } else {
        app.on('ready', () => { console.log('appisready'); setTimeout(resolve, 500); });
    }
});

app.on('ready', function () {
    setApplicationMenu();

    mainWindow = createWindow('main', {
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
    if (process.argv.length > 1) {
        const site = processProtocolArgv(process.argv);
        if (site) {
            //openAddHostDialog(site);
            appIsReady.then(() => {
                //  openAddHostDialog(site);
                mainWindow.send('add-host', site);

            });
        }
    }

});

app.on('window-all-closed', function () {
    app.quit();
});


if (process.platform === 'darwin') {
// Open protocol urls on mac as open-url is not yet implemented on other OS's
    app.on('open-url', function (e, url) {
        e.preventDefault();
        const site = processProtocolURI(url);
        if (site) {
            appIsReady.then(() => {
                //  openAddHostDialog(site);
                mainWindow.send('add-host', site);

            });
        }
    });
} else {
    const shouldQuit = app.makeSingleInstance((argv) => {
    // Someone tried to run a second instance, we should focus our window.
        const site = processProtocolArgv(argv);
        if (site) {
            appIsReady.then(() => {
                //  openAddHostDialog(site);
                mainWindow.send('add-host', site);

            });
        }
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
        }
    });

    if (shouldQuit) {
        app.quit();
    }
}
