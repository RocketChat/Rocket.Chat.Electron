import { app } from 'electron';
import i18next from 'i18next';

import { getI18nextInitOptions } from './common/getI18nextInitOptions';
import { setReduxStore } from './common/store';
import { createMainReduxStore } from './mainProcess/createMainReduxStore';
import {
  setupDeepLinks,
  processDeepLinksInArgs,
} from './mainProcess/deepLinks';
import { setUserDataDirectory } from './mainProcess/dev';
import dock from './mainProcess/dock';
import { setupDownloads } from './mainProcess/downloads';
import menuBar from './mainProcess/menuBar';
import { setupNotifications } from './mainProcess/notifications';
import { performElectronStartup } from './mainProcess/performElectronStartup';
import { createRootWindow, showRootWindow } from './mainProcess/rootWindow';
import { attachGuestWebContentsEvents } from './mainProcess/serverView';
import { setupApp } from './mainProcess/setupApp';
import { setupMainErrorHandling } from './mainProcess/setupMainErrorHandling';
import { setupNavigation } from './mainProcess/setupNavigation';
import { setupPowerMonitor } from './mainProcess/setupPowerMonitor';
import { setupSpellChecking } from './mainProcess/setupSpellChecking';
import touchBar from './mainProcess/touchBar';
import trayIcon from './mainProcess/trayIcon';
import { setupUpdates } from './mainProcess/updates';
import { watchAndPersistChanges } from './mainProcess/watchAndPersistChanges';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  await app.whenReady();

  setReduxStore(await createMainReduxStore());

  await i18next.init(await getI18nextInitOptions(app.getLocale()));

  createRootWindow();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }

  setupApp();
  setupNotifications();
  setupSpellChecking();
  setupDeepLinks();
  setupNavigation();
  setupPowerMonitor();
  setupUpdates();
  setupDownloads();

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

  await processDeepLinksInArgs();
};

if (require.main === module) {
  start();
}
