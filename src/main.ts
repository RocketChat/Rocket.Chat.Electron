import { app } from 'electron';

import { getInitialState } from './common/getInitialState';
import { setReduxStore } from './common/store';
import { createMainReduxStore } from './mainProcess/createMainReduxStore';
import {
  setupDeepLinks,
  processDeepLinksInArgs,
} from './mainProcess/deepLinks';
import { setUserDataDirectory } from './mainProcess/dev';
import dock from './mainProcess/dock';
import { setupDownloads } from './mainProcess/downloads';
import { extractLocalStorage } from './mainProcess/extractLocalStorage';
import i18n from './mainProcess/i18n';
import menuBar from './mainProcess/menuBar';
import { mergePersistableValues } from './mainProcess/mergePersistableValues';
import { mergeServers } from './mainProcess/mergeServers';
import { mergeTrustedCertificates } from './mainProcess/mergeTrustedCertificates';
import { mergeUpdatesConfiguration } from './mainProcess/mergeUpdatesConfiguration';
import { setupNotifications } from './mainProcess/notifications';
import { performElectronStartup } from './mainProcess/performElectronStartup';
import { createRootWindow, showRootWindow } from './mainProcess/rootWindow';
import { attachGuestWebContentsEvents } from './mainProcess/serverView';
import { setupServers } from './mainProcess/servers';
import { setupApp } from './mainProcess/setupApp';
import { setupMainErrorHandling } from './mainProcess/setupMainErrorHandling';
import { setupNavigation } from './mainProcess/setupNavigation';
import { setupPowerMonitor } from './mainProcess/setupPowerMonitor';
import { setupScreenSharing } from './mainProcess/setupScreenSharing';
import { setupSpellChecking } from './mainProcess/setupSpellChecking';
import touchBar from './mainProcess/touchBar';
import trayIcon from './mainProcess/trayIcon';
import { setupUpdates } from './mainProcess/updates';
import { watchAndPersistChanges } from './mainProcess/watchAndPersistChanges';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  setReduxStore(createMainReduxStore());

  await app.whenReady();

  const localStorage = await extractLocalStorage();

  await Promise.resolve(getInitialState())
    .then((state) => mergePersistableValues(state, localStorage))
    .then((state) => mergeServers(state, localStorage))
    .then((state) => mergeUpdatesConfiguration(state))
    .then((state) => mergeTrustedCertificates(state));

  i18n.setUp();
  await i18n.wait();

  setupApp();

  createRootWindow();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }

  setupNotifications();
  setupScreenSharing();

  await setupSpellChecking();

  setupDeepLinks();
  setupNavigation();
  setupPowerMonitor();
  setupUpdates();
  setupDownloads();
  setupServers();

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
