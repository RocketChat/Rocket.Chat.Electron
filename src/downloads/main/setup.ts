import path from 'path';

import { app, webContents } from 'electron';
import electronDl from 'electron-dl';
import ElectronStore from 'electron-store';
import { t } from 'i18next';

import { createNotification } from '../../notifications/preload';
import { handleWillDownloadEvent } from '../main';

// Simple store for download directory persistence
let defaultDownloadPath: string;
try {
  defaultDownloadPath = app.getPath('downloads');
} catch {
  defaultDownloadPath = '/tmp';
}

const downloadStore = new ElectronStore({
  name: 'download-preferences',
  defaults: {
    lastDownloadDirectory: defaultDownloadPath,
  },
});

export const setupElectronDlWithTracking = () => {
  electronDl({
    saveAs: true,
    onStarted: (item) => {
      try {
        // Set the save dialog options with both directory and filename
        let lastDownloadDir: string;
        try {
          lastDownloadDir = downloadStore.get(
            'lastDownloadDirectory',
            defaultDownloadPath
          ) as string;
        } catch {
          // Fallback if store fails
          lastDownloadDir = defaultDownloadPath;
        }

        const fullPath = path.join(lastDownloadDir, item.getFilename());

        item.setSaveDialogOptions({
          defaultPath: fullPath,
        });

        // Find the webContents that initiated this download
        const webContentsArray = webContents.getAllWebContents();

        // Use the first available webContents for tracking
        let sourceWebContents = null;
        for (const wc of webContentsArray) {
          if (wc && typeof wc.isDestroyed === 'function' && !wc.isDestroyed()) {
            sourceWebContents = wc;
            break;
          }
        }

        if (sourceWebContents) {
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
        const downloadDirectory = path.dirname(file.path);
        downloadStore.set('lastDownloadDirectory', downloadDirectory);

        createNotification({
          title: 'Downloads',
          body: file.filename,
          subtitle: t('downloads.notifications.downloadFinished'),
        });
      } catch {
        // Silently handle any errors in onCompleted
      }
    },
  });
};

// Export the store for testing purposes
export { downloadStore };
