import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import jetpack from 'fs-jetpack';

const userDataDir = jetpack.cwd(app.getPath('userData'));
const updateStoreFile = 'update.json';
let checkForUpdatesEvent;

autoUpdater.autoDownload = false;

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
        }
    });
}

function updateAvailable ({version}) {
    if (checkForUpdatesEvent) {
        checkForUpdatesEvent.sender.send('update-result', true);
    } else {
        try {
            const updateFile = userDataDir.read(updateStoreFile, 'json');
            if (updateFile && updateFile.skip === version) {
                console.log(`Skipping version: ${version}`);
                return;
            }
        } catch (err) {
            console.log(err);
        }
    }

    let window = new BrowserWindow({
        width: 600,
        height: 350,
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
                userDataDir.write(updateStoreFile, {skip: version}, { atomic: true });
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

    autoUpdater.on('download-progress', ({percent}) => {
        console.log(`Update progress: ${percent}`);
    });

    autoUpdater.on('update-downloaded', updateDownloaded);

    // Event from about window
    ipcMain.on('check-for-updates', (e) => {
        checkForUpdatesEvent = e;
        autoUpdater.checkForUpdates();
    });

    autoUpdater.checkForUpdates();
}

export {
    checkForUpdates
};
