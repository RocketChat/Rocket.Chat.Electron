import Store from 'electron-store';
import { app, remote } from 'electron';
import jetpack from 'fs-jetpack';

const _app = app || remote.app;

if (app && (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true')) {
  const userDataPath = app.getPath('userData');
  app.setPath('userData', `${userDataPath} (${process.env.NODE_ENV})`);
}


const installDir = jetpack.cwd(_app.getAppPath());
const updateStoreFile = 'update.json';

let autoUpdate = true;
try {
  const file = installDir.read(updateStoreFile, 'json');
  if (file && file.autoUpdate !== undefined) {
    autoUpdate = file.autoUpdate;
  }
} catch (err) {
  console.error(err);
}

const store = new Store({
  defaults: {
    autoUpdate
  }
});

export default store;
