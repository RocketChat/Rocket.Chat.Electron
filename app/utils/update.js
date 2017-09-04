import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import jetpack from 'fs-jetpack';
import { dispatch, getState } from '../store/mainStore';
import { updateAvailable, updateProgress } from '../actions/update';
import i18n from '../i18n';
import store from './store';

let checkForUpdatesEvent;

autoUpdater.autoDownload = false;
if (process.env.NODE_ENV === 'development') {
  autoUpdater.updateConfigPath = path.join(__dirname, '../../dev-app-update.yml');
  autoUpdater.currentVersion = require('../package.json').version; // eslint-disable-line
}
/*
let updateFile = {};
try {
  const installDir = jetpack.cwd(app.getAppPath());
  const userDataDir = jetpack.cwd(app.getPath('userData'));
  const updateStoreFile = 'update.json';
  const installUpdateFile = installDir.read(updateStoreFile, 'json');
  const userUpdateFile = userDataDir.read(updateStoreFile, 'json');
  updateFile = Object.assign({}, installUpdateFile, userUpdateFile);
} catch (err) {
  console.error(err);
}
*/
function updateDownloaded() {
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

function updateNotAvailable() {
  if (checkForUpdatesEvent) {
    checkForUpdatesEvent.sender.send('update-result', false);
    checkForUpdatesEvent = null;
  }
}
const skip = store.get('skipUpdate');
function updateResult(options = {}) {
  const update = Object.assign({}, options, { skip, checked: true });
  dispatch(updateAvailable(update));
}

function downloadUpdate() {
  autoUpdater.downloadUpdate();
}


function checkForUpdates() {
  autoUpdater.on('update-available', ({ version }) => updateResult({ version }));
  autoUpdater.on('update-not-available', () => updateResult());

  autoUpdater.on('update-downloaded', () => updateResult({ downloaded: true }));
  autoUpdater.on('update-progress', progress => updateResult({ progress }));

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

  ipcMain.on('download-update', () => autoUpdater.downloadUpdate());

  if (store.get('autoUpdate') !== false) {
    autoUpdater.checkForUpdates();
  }
}

export default {
  checkForUpdates,
  downloadUpdate
};
