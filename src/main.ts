import { app } from 'electron';

import { performElectronStartup, setupApp } from './app/main/app';
import {
  getLocalStorage,
  mergePersistableValues,
  purgeLocalStorage,
  watchAndPersistChanges,
} from './app/main/data';
import { setUserDataDirectory, installDevTools } from './app/main/dev';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks/main';
import { setupMainErrorHandling } from './errors';
import i18n from './i18n/main';
import { setupNavigation } from './navigation/main';
import { setupNotifications } from './notifications/main';
import { setupScreenSharing } from './screenSharing/main';
import { setupServers } from './servers/main';
import { setupSpellChecking } from './spellChecking/main';
import { createMainReduxStore } from './store';
import dock from './ui/main/dock';
import menuBar from './ui/main/menuBar';
import {
  createRootWindow,
  setupRootWindow,
  applyMainWindowState,
  showRootWindow,
} from './ui/main/rootWindow';
import touchBar from './ui/main/touchBar';
import trayIcon from './ui/main/trayIcon';
import { attachGuestWebContentsEvents } from './ui/main/webviews';
import { setupUpdates } from './updates/main';
import { setupPowerMonitor } from './userPresence/main';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  createMainReduxStore();

  await app.whenReady();

  i18n.setUp();

  await i18n.wait();

  if (process.env.NODE_ENV === 'development') {
    installDevTools();
  }

  const rootWindow = createRootWindow();

  attachGuestWebContentsEvents(rootWindow);

  await showRootWindow(rootWindow);

  setupApp();
  setupNotifications();
  setupScreenSharing();

  const localStorage = await getLocalStorage();

  await mergePersistableValues(localStorage);
  await setupServers(localStorage);
  await setupSpellChecking(localStorage);

  setupDeepLinks();
  await setupNavigation();
  setupPowerMonitor();
  await setupUpdates();

  dock.setUp();
  menuBar.setUp();
  touchBar.setUp();
  trayIcon.setUp();
  setupRootWindow();

  app.addListener('before-quit', () => {
    dock.tearDown();
    menuBar.tearDown();
    touchBar.tearDown();
    trayIcon.tearDown();
  });

  applyMainWindowState();

  await purgeLocalStorage();
  watchAndPersistChanges();

  await processDeepLinksInArgs();
};

if (require.main === module) {
  start();
}
