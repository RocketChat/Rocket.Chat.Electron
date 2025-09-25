import path from 'path';

import { app, webContents } from 'electron';
import electronDl from 'electron-dl';
import ElectronStore from 'electron-store';
import { t } from 'i18next';

import { performElectronStartup, setupApp } from './app/main/app';
import {
  mergePersistableValues,
  watchAndPersistChanges,
} from './app/main/data';
import { setUserDataDirectory } from './app/main/dev';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks/main';
import { startDocumentViewerHandler } from './documentViewer/ipc';
import { setupDownloads, handleWillDownloadEvent } from './downloads/main';
import { setupMainErrorHandling } from './errors';
import i18n from './i18n/main';
import { handleJitsiDesktopCapturerGetSources } from './jitsi/ipc';
import { setupNavigation } from './navigation/main';
import { setupNotifications } from './notifications/main';
import { createNotification } from './notifications/preload';
import { startOutlookCalendarUrlHandler } from './outlookCalendar/ipc';
import { setupScreenSharing } from './screenSharing/main';
import { handleClearCacheDialog } from './servers/cache';
import { setupServers } from './servers/main';
import { checkSupportedVersionServers } from './servers/supportedVersions/main';
import { setupSpellChecking } from './spellChecking/main';
import { createMainReduxStore } from './store';
import { handleCertificatesManager } from './ui/components/CertificatesManager/main';
import dock from './ui/main/dock';
import menuBar from './ui/main/menuBar';
import {
  createRootWindow,
  showRootWindow,
  exportLocalStorage,
  watchMachineTheme,
} from './ui/main/rootWindow';
import { attachGuestWebContentsEvents } from './ui/main/serverView';
import touchBar from './ui/main/touchBar';
import trayIcon from './ui/main/trayIcon';
import { setupUpdates } from './updates/main';
import { setupPowerMonitor } from './userPresence/main';
import {
  handleDesktopCapturerGetSources,
  startVideoCallWindowHandler,
  cleanupVideoCallResources,
} from './videoCallWindow/ipc';

// Simple store for download directory persistence
const downloadStore = new ElectronStore({
  name: 'download-preferences',
  defaults: {
    lastDownloadDirectory: app.getPath('downloads'),
  },
});

const setupElectronDlWithTracking = () => {
  electronDl({
    saveAs: true,
    onStarted: (item) => {
      // Set the save dialog options with both directory and filename
      const lastDownloadDir = downloadStore.get(
        'lastDownloadDirectory',
        app.getPath('downloads')
      ) as string;

      const fullPath = path.join(lastDownloadDir, item.getFilename());

      item.setSaveDialogOptions({
        defaultPath: fullPath,
      });

      // Find the webContents that initiated this download
      const webContentsArray = webContents.getAllWebContents();

      // Use the first available webContents for tracking
      let sourceWebContents = null;
      for (const wc of webContentsArray) {
        if (wc && !wc.isDestroyed()) {
          sourceWebContents = wc;
          break;
        }
      }

      if (sourceWebContents) {
        const fakeEvent = { defaultPrevented: false, preventDefault: () => {} };
        handleWillDownloadEvent(
          fakeEvent as any,
          item,
          sourceWebContents
        ).catch(() => {
          // Silently handle tracking errors
        });
      }
    },
    onCompleted: (file) => {
      // Remember the directory where the file was saved
      const downloadDirectory = path.dirname(file.path);
      downloadStore.set('lastDownloadDirectory', downloadDirectory);

      createNotification({
        title: 'Downloads',
        body: file.filename,
        subtitle: t('downloads.notifications.downloadFinished'),
      });
    },
  });
};

const start = async (): Promise<void> => {
  setUserDataDirectory();

  performElectronStartup();

  await app.whenReady();

  createMainReduxStore();

  // Set up electron-dl with our download tracking callbacks
  setupElectronDlWithTracking();

  const localStorage = await exportLocalStorage();
  await mergePersistableValues(localStorage);
  await setupServers(localStorage);

  i18n.setUp();
  await i18n.wait();

  setupApp();

  setupMainErrorHandling();

  createRootWindow();
  startOutlookCalendarUrlHandler();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }
  watchMachineTheme();
  setupNotifications();
  setupScreenSharing();
  startVideoCallWindowHandler();

  await setupSpellChecking();

  setupDeepLinks();
  await setupNavigation();
  setupPowerMonitor();
  await setupUpdates();
  setupDownloads();
  handleCertificatesManager();

  dock.setUp();
  menuBar.setUp();
  touchBar.setUp();
  trayIcon.setUp();

  app.addListener('before-quit', () => {
    dock.tearDown();
    menuBar.tearDown();
    touchBar.tearDown();
    trayIcon.tearDown();
    cleanupVideoCallResources();
  });

  watchAndPersistChanges();
  handleJitsiDesktopCapturerGetSources();
  handleDesktopCapturerGetSources();
  handleClearCacheDialog();
  startDocumentViewerHandler();
  checkSupportedVersionServers();

  await processDeepLinksInArgs();

  console.log('Application initialization completed successfully');
};

start();
