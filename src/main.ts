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
import { setupI18n } from './i18n/main';
import { setupNavigation } from './navigation/main';
import { setupNotifications } from './notifications/main';
import { setupScreenSharing } from './screenSharing/main';
import { setupServers } from './servers/main';
import { setupSpellChecking } from './spellChecking/main';
import { createMainReduxStore } from './store';
import dock from './ui/main/dock';
import { setupMenuBar } from './ui/main/menuBar';
import {
  createRootWindow,
  setupRootWindow,
  applyMainWindowState,
  showRootWindow,
} from './ui/main/rootWindow';
import { setupTouchBar } from './ui/main/touchBar';
import { setupTrayIcon } from './ui/main/trayIcon';
import { attachGuestWebContentsEvents } from './ui/main/webviews';
import { setupUpdates } from './updates/main';
import { setupPowerMonitor } from './userPresence/main';

const start = async (): Promise<void> => {
  app.on('before-quit', () => console.log('before-quit'));

  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  createMainReduxStore();

  await app.whenReady();

  await setupI18n();

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
  setupMenuBar();
  setupRootWindow();
  setupTouchBar();
  setupTrayIcon();

  app.addListener('before-quit', () => {
    dock.tearDown();
  });

  applyMainWindowState();

  await purgeLocalStorage();
  watchAndPersistChanges();

  await processDeepLinksInArgs();
};

if (require.main === module) {
  start();
}
