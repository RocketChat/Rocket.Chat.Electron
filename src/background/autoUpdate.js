import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import jetpack from 'fs-jetpack';

const installDir = jetpack.cwd(app.getAppPath());
const userDataDir = jetpack.cwd(app.getPath('userData'));
const updateStoreFile = 'update.json';
let checkForUpdatesEvent;

autoUpdater.autoDownload = false;

let updateFile = {};
try {
    const installUpdateFile = installDir.read(updateStoreFile, 'json');
    const userUpdateFile = userDataDir.read(updateStoreFile, 'json');
    updateFile = Object.assign({}, installUpdateFile, userUpdateFile);
} catch (err) {
    console.log(err);
}

function updateDownloaded () {
    dialog.showMessageBox({
        title: 'Update Ready to Install',
        message: 'Update has been downloaded',
        buttons: [
            'Install Later',
            'Install Now'
        ],
        defaultId: 1
    }, (response) => {
        if (response === 0) {
            dialog.showMessageBox({
                title: 'Installing Later',
                message: 'Update will be installed when you exit the app'
            });
        } else {
            autoUpdater.quitAndInstall();
            setTimeout(() => app.quit(), 1000);
        }
    });
}

function updateNotAvailable () {
    if (checkForUpdatesEvent) {
        checkForUpdatesEvent.sender.send('update-result', false);
        checkForUpdatesEvent = null;
    }
}

function updateAvailable ({version}) {
    if (checkForUpdatesEvent) {
        checkForUpdatesEvent.sender.send('update-result', true);
        checkForUpdatesEvent = null;
    } else if (updateFile.skip === version) {
        console.log(`Skipping version: ${version}`);
        return;
    }

    let window = new BrowserWindow({
        title: 'Update Available',
        width: 600,
        height: 330,
        show : false,
        center: true,
        resizable: false,
        maximizable: false,
        minimizable: false
    });

    window.loadURL(`file://${__dirname}/public/update.html`);
    window.setMenuBarVisibility(false);

    window.webContents.on('did-finish-load', () => {
        window.webContents.send('new-version', version);
        window.show();
    });

    ipcMain.once('update-response', (e, type) => {
        switch (type) {
            case 'skip':
                updateFile.skip = version;
                userDataDir.write(updateStoreFile, updateFile, { atomic: true });
                dialog.showMessageBox({
                    title: 'Skip Update',
                    message: 'We will notify you when the next update is available\n' +
                        'If you change your mind you can check for updates from the About menu.'
                }, () => window.close());
                break;
            case 'remind':
                dialog.showMessageBox({
                    title: 'Remind Later',
                    message: 'We will remind you next time you start the app'
                }, () => window.close());
                break;
            case 'update':
                dialog.showMessageBox({
                    title: 'Downloading Update',
                    message: 'You will be notified when the update is ready to be installed'
                }, () => window.close());
                autoUpdater.downloadUpdate();
                break;
        }
    });

    window.on('closed', () => {
        window = null;
        ipcMain.removeAllListeners('update-response');
    });
}

function checkForUpdates () {
    autoUpdater.on('update-available', updateAvailable);
    autoUpdater.on('update-not-available', updateNotAvailable);

    autoUpdater.on('download-progress', ({percent}) => {
        console.log(`Update progress: ${percent}`);
    });

    autoUpdater.on('update-downloaded', updateDownloaded);

    // Event from about window
    ipcMain.on('check-for-updates', (e, autoUpdate) => {
        if (autoUpdate === true || autoUpdate === false) {
            updateFile.autoUpdate = autoUpdate;
            userDataDir.write(updateStoreFile, updateFile, { atomic: true });
        } else if (autoUpdate === 'auto') {
            e.returnValue = updateFile.autoUpdate !== false;
        } else {
            checkForUpdatesEvent = e;
            autoUpdater.checkForUpdates();
        }
    });

    if (updateFile.autoUpdate !== false) {
        autoUpdater.checkForUpdates();
    }
}

export {
    checkForUpdates
};
