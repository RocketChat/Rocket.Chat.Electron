import { existsSync, statSync } from 'fs';
import path from 'path';

import { app, webContents } from 'electron';
import electronDl from 'electron-dl';
import ElectronStore from 'electron-store';
import { t } from 'i18next';

import { createNotification } from '../../notifications/preload';
import { handleWillDownloadEvent } from '../main';

type DownloadPrefs = {
  lastDownloadDirectory: string;
};

// Simple store for download directory persistence
let defaultDownloadPath: string;
try {
  defaultDownloadPath = app.getPath('downloads');
} catch {
  defaultDownloadPath = '/tmp';
}

function isValidDirectory(dir: string): boolean {
  try {
    return !!dir && existsSync(dir) && statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const downloadStore = new ElectronStore<DownloadPrefs>({
  name: 'download-preferences',
  defaults: {
    lastDownloadDirectory: defaultDownloadPath,
  },
  schema: {
    lastDownloadDirectory: { type: 'string' },
  },
});

export const setupElectronDlWithTracking = () => {
  electronDl({
    saveAs: true,
    onStarted: (item) => {
      try {
        // Set the save dialog options with both directory and filename
        const configuredDir = downloadStore.get(
          'lastDownloadDirectory',
          defaultDownloadPath
        );
        const lastDownloadDir =
          configuredDir && isValidDirectory(configuredDir)
            ? configuredDir
            : defaultDownloadPath;
        const fullPath = path.join(lastDownloadDir, item.getFilename());

        item.setSaveDialogOptions({
          defaultPath: fullPath,
        });

        // Find the webContents that initiated this download
        const webContentsArray = webContents.getAllWebContents();

        const sourceWebContents =
          // electron-dl passes a BrowserWindow; fall back if it already gave us webContents.
          (browserWindowOrWebContents as Electron.BrowserWindow | undefined)?.webContents ??
          (browserWindowOrWebContents as Electron.WebContents | undefined);

        if (
          sourceWebContents &&
          typeof sourceWebContents.isDestroyed === 'function' &&
          !sourceWebContents.isDestroyed()
        ) {
          const fakeEvent = {
            defaultPrevented: false,
            preventDefault: () => {},
          };
          handleWillDownloadEvent(
            fakeEvent as any,
            item,
            sourceWebContents
          ).catch(() => {
            // Silently handle tracking errors
          });
        }
      } catch {
        // Silently handle any other errors in onStarted
      }
    },
    onCompleted: (file) => {
      try {
        // Remember the directory where the file was saved
        if (file.path) {
          const downloadDirectory = path.dirname(file.path);
          downloadStore.set('lastDownloadDirectory', downloadDirectory);
        }

      } catch {
        // Silently handle any errors in onCompleted
      }
    },
  });
};

// Export the store for testing purposes
export { downloadStore };
