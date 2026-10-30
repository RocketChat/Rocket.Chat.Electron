import fs from 'fs';
import path from 'path';

import type { WebContents } from 'electron';
import { app } from 'electron';

export const setUserDataDirectory = (): void => {
  if (process.env.NODE_ENV !== 'development' || process.mas) {
    return;
  }

  const folder = path.join(app.getPath('appData'), `${app.name} (development)`);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  console.log(`Setting user data directory to ${folder}`);
  app.setPath('userData', folder);
};

// On macOS, safeStorage keeps its key in the keychain item "<app name> Safe
// Storage". A dev build that uses the production item gets a password dialog
// and adds the dev Electron.app to that item's access list. With
// ROCKETCHAT_DEV_KEYCHAIN_ITEM=true, a dev build uses its own item
// "Rocket.Chat (development) Safe Storage". Call this before `ready`, and
// after setUserDataDirectory, so that the user data folder keeps its name.
export const setDevelopmentAppName = (): void => {
  if (
    process.env.NODE_ENV !== 'development' ||
    app.isPackaged ||
    process.mas ||
    process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM !== 'true'
  ) {
    return;
  }

  const name = `${app.name} (development)`;
  console.log(`Setting app name to ${name}`);
  app.setName(name);
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
