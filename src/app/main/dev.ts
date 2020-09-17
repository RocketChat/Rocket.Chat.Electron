import path from 'path';

import chokidar from 'chokidar';
import { app, WebContents } from 'electron';

export const setUserDataDirectory = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  app.setPath('userData', path.join(app.getPath('appData'), `${ app.name } (development)`));
};

export const setupRootWindowReload = (webContents: WebContents): void => {
  chokidar.watch(path.join(app.getAppPath(), 'app/rootWindow.js'), {
    awaitWriteFinish: true,
  }).on('change', () => {
    if (webContents.isDestroyed()) {
      return;
    }

    console.log('Reloading root window...');
    webContents.reload();
  });
};

export const setupPreloadReload = (webContents: WebContents): void => {
  chokidar.watch(path.join(app.getAppPath(), 'app/preload.js'), {
    awaitWriteFinish: true,
  }).on('change', () => {
    if (webContents.isDestroyed()) {
      return;
    }

    console.log('Reloading webview...');
    webContents.reload();
  });
};

export const installDevTools = async (): Promise<void> => {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS,
  } = await import('electron-devtools-installer');
  await installExtension(REACT_DEVELOPER_TOOLS);
  await installExtension(REDUX_DEVTOOLS);
};
