import fs from 'fs';
import path from 'path';

import { app, WebContents } from 'electron';

export const setUserDataDirectory = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const folder = path.join(app.getPath('appData'), `${app.name} (development)`);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  app.setPath('userData', folder);
};

export const setupRootWindowReload = async (
  webContents: WebContents
): Promise<void> => {
  const chokidar = await import('chokidar');
  chokidar
    .watch(path.join(app.getAppPath(), 'app/rootWindow.js'), {
      awaitWriteFinish: true,
    })
    .on('change', () => {
      if (webContents.isDestroyed()) {
        return;
      }

      console.log('Reloading root window...');
      webContents.reload();
    });
};

export const setupPreloadReload = async (
  webContents: WebContents
): Promise<void> => {
  const chokidar = await import('chokidar');
  chokidar
    .watch(
      [
        path.join(app.getAppPath(), 'app/preload.js'),
        path.join(app.getAppPath(), 'app/injected.js'),
      ],
      {
        awaitWriteFinish: true,
      }
    )
    .on('change', () => {
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
