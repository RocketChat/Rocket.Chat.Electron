import { existsSync, statSync } from 'fs';
import os from 'os';
import path from 'path';

import { app } from 'electron';
import electronDl from 'electron-dl';
import ElectronStore from 'electron-store';
import { t } from 'i18next';

import { createNotification } from '../../notifications/preload';
import { handleWillDownloadEvent } from '../main';

type DownloadPrefs = {
  lastDownloadDirectory?: string;
};

// Lazy default download path resolution
let cachedDefaultDownloadPath: string | null = null;

function getDefaultDownloadPath(): string {
  if (cachedDefaultDownloadPath === null) {
    try {
      cachedDefaultDownloadPath = app.getPath('downloads');
    } catch {
      cachedDefaultDownloadPath = os.tmpdir();
    }
  }
  return cachedDefaultDownloadPath;
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
          getDefaultDownloadPath()
        );
        const lastDownloadDir =
          configuredDir && isValidDirectory(configuredDir)
            ? configuredDir
            : getDefaultDownloadPath();
        const fullPath = path.join(lastDownloadDir, item.getFilename());

        item.setSaveDialogOptions({
          defaultPath: fullPath,
        });
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

        createNotification({
          title: t('downloads.title', { defaultValue: 'Downloads' }),
          body: file.filename || 'Unknown file',
          subtitle: t('downloads.notifications.downloadFinished'),
          category: 'DOWNLOADS',
        });
      } catch {
        // Silently handle any errors in onCompleted
      }
    },
  });

  app.on('session-created', (session) => {
    session.on('will-download', (event, item, sourceWebContents) => {
      handleWillDownloadEvent(event, item, sourceWebContents).catch(() => {
        // Silently handle tracking errors
      });
    });
  });
};

// Export the store for testing purposes
export { downloadStore };
