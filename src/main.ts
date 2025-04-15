import { app } from 'electron';
import electronDl from 'electron-dl';

import { performElectronStartup, setupApp } from './app/main/app';
import {
  mergePersistableValues,
  watchAndPersistChanges,
} from './app/main/data';
import { setUserDataDirectory } from './app/main/dev';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks/main';
import { startDocumentViewerHandler } from './documentViewer/ipc';
import { setupDownloads } from './downloads/main';
import { setupMainErrorHandling } from './errors';
import i18n from './i18n/main';
import { handleJitsiDesktopCapturerGetSources } from './jitsi/ipc';
import { setupNavigation } from './navigation/main';
import { setupNotifications } from './notifications/main';
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
} from './videoCallWindow/ipc';

electronDl({ saveAs: true });

const start = async (): Promise<void> => {
  setUserDataDirectory();

  performElectronStartup();

  await app.whenReady();

  createMainReduxStore();

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
  });

  watchAndPersistChanges();
  handleJitsiDesktopCapturerGetSources();
  handleDesktopCapturerGetSources();
  handleClearCacheDialog();
  startDocumentViewerHandler();
  checkSupportedVersionServers();

  await processDeepLinksInArgs();
};

start();
