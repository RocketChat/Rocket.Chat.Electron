import fs from 'fs';
import path from 'path';

import type { FSWatcher } from 'chokidar';
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

// On macOS, a chokidar watcher that is still open when Node frees the
// environment makes fsevents release an already-deleted N-API thread-safe
// function, and the main process hangs forever in app.quit(). Close every
// watcher while JS still runs.
const reloadWatchers = new Set<FSWatcher>();

const closeReloadWatchers = (): void => {
  for (const watcher of reloadWatchers) {
    void watcher.close();
  }
  reloadWatchers.clear();
};

const trackReloadWatcher = (watcher: FSWatcher): FSWatcher => {
  if (reloadWatchers.size === 0) {
    app.once('will-quit', closeReloadWatchers);
  }
  reloadWatchers.add(watcher);
  return watcher;
};

export const setupRootWindowReload = async (
  webContents: WebContents
): Promise<void> => {
  const chokidar = await import('chokidar');
  trackReloadWatcher(
    chokidar.watch(path.join(app.getAppPath(), 'app/rootWindow.js'), {
      awaitWriteFinish: true,
    })
  ).on('change', () => {
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
  trackReloadWatcher(
    chokidar.watch(
      [
        path.join(app.getAppPath(), 'app/preload.js'),
        path.join(app.getAppPath(), 'app/injected.js'),
      ],
      {
        awaitWriteFinish: true,
      }
    )
  ).on('change', () => {
    if (webContents.isDestroyed()) {
      return;
    }

    console.log('Reloading webview...');
    webContents.reload();
  });
};
