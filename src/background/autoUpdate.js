import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import jetpack from 'fs-jetpack';
import i18n from '../i18n/index.js';

const installDir = jetpack.cwd(app.getAppPath());
const userDataDir = jetpack.cwd(app.getPath('userData'));
const updateStoreFile = 'update.json';
let checkForUpdatesEvent;

let updateFile = {};
try {
    const installUpdateFile = installDir.read(updateStoreFile, 'json');
    const userUpdateFile = userDataDir.read(updateStoreFile, 'json');
    updateFile = Object.assign({}, installUpdateFile, userUpdateFile);
} catch (err) {
    console.error(err);
}

function updateDownloaded () {
    dialog.showMessageBox({
        title: i18n.__('Update_ready'),
        message: i18n.__('Update_ready_message'),
        buttons: [
            i18n.__('Update_Install_Later'),
            i18n.__('Update_Install_Now')
        ],
        defaultId: 1
    }, (response) => {
        if (response === 0) {
            dialog.showMessageBox({
                title: i18n.__('Update_installing_later'),
                message: i18n.__('Update_installing_later_message')
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
        return;
    }

    let window = new BrowserWindow({
        title: i18n.__('Update_Available'),
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
                    title: i18n.__('Update_skip'),
                    message: i18n.__('Update_skip_message')
                }, () => window.close());
                break;
            case 'remind':
                dialog.showMessageBox({
                    title: i18n.__('Update_remind'),
                    message: i18n.__('Update_remind_message')
                }, () => window.close());
                break;
            case 'update':
                dialog.showMessageBox({
                    title: i18n.__('Update_downloading'),
                    message: i18n.__('Update_downloading_message')
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

export const canUpdate = () =>
    (process.platform === 'linux' && Boolean(process.env.APPIMAGE)) &&
    (process.platform === 'win32' && !process.windowsStore) &&
    (process.platform === 'darwin' && !process.mas);

export const canAutoUpdate = () => updateFile.autoUpdate !== false;

export const setAutoUpdate = (canAutoUpdate) => {
    updateFile.autoUpdate = Boolean(canAutoUpdate);
    userDataDir.write(updateStoreFile, updateFile, { atomic: true });
};

ipcMain.on('can-update', (event) => {
    event.returnValue = canUpdate();
});

ipcMain.on('can-auto-update', (event) => {
    event.returnValue = canAutoUpdate();
});

ipcMain.on('set-auto-update', (event, canAutoUpdate) => {
    setAutoUpdate(canAutoUpdate);
});

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', updateAvailable);
autoUpdater.on('update-not-available', updateNotAvailable);
autoUpdater.on('update-downloaded', updateDownloaded);

ipcMain.on('check-for-updates', (event) => {
    if (canAutoUpdate() && canUpdate()) {
        checkForUpdatesEvent = event;
        autoUpdater.checkForUpdates();
    }
});

export default () => {
    if (canAutoUpdate() && canUpdate()) {
        autoUpdater.checkForUpdates();
    }
};
