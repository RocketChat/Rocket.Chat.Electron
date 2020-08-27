import { app } from 'electron';

import { setupMainErrorHandling } from './errors';
import { setupI18n } from './i18n/main';
import { performElectronStartup, setupApp } from './main/app';
import {
  getLocalStorage,
  mergePersistableValues,
  purgeLocalStorage,
  watchAndPersistChanges,
} from './main/data';
import { setupDeepLinks, processDeepLinksInArgs } from './main/deepLinks';
import { setUserDataDirectory, setupElectronReloader, installDevTools } from './main/dev';
import { setupNavigation } from './main/navigation';
import { setupPowerMonitor } from './main/powerMonitor';
import { setupScreenSharing } from './main/screenSharing';
import { setupServers } from './main/servers';
import { setupSpellChecking } from './main/spellChecking';
import { setupDock } from './main/ui/dock';
import { setupMenuBar } from './main/ui/menuBar';
import { setupNotifications } from './main/ui/notifications';
import {
  createRootWindow,
  setupRootWindow,
  applyMainWindowState,
} from './main/ui/rootWindow';
import { setupTouchBar } from './main/ui/touchBar';
import { setupTrayIcon } from './main/ui/trayIcon';
import { setupUpdates } from './main/updates';
import { createMainReduxStore } from './store';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  createMainReduxStore();
  setupI18n();

  await app.whenReady();

  if (process.env.NODE_ENV === 'development') {
    setupElectronReloader();
    installDevTools();
  }

  createRootWindow();

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

  setupDock();
  setupMenuBar();
  setupRootWindow();
  setupTouchBar();

  setupTrayIcon();

  applyMainWindowState();

  await purgeLocalStorage();
  watchAndPersistChanges();

  await processDeepLinksInArgs();
};

if (require.main === module) {
  start();
}
