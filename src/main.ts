import { app } from 'electron';
import i18next from 'i18next';

import { getI18nextInitOptions } from './common/getI18nextInitOptions';
import { setReduxStore } from './common/store';
import { createMainReduxStore } from './mainProcess/createMainReduxStore';
import { setUserDataDirectory } from './mainProcess/dev';
import dock from './mainProcess/dock';
import menuBar from './mainProcess/menuBar';
import { setupNotifications } from './mainProcess/notifications';
import { performElectronStartup } from './mainProcess/performElectronStartup';
import { createRootWindow, showRootWindow } from './mainProcess/rootWindow';
import { rootSaga } from './mainProcess/sagas';
import { attachGuestWebContentsEvents } from './mainProcess/serverView';
import { setupMainErrorHandling } from './mainProcess/setupMainErrorHandling';
import { setupNavigation } from './mainProcess/setupNavigation';
import touchBar from './mainProcess/touchBar';
import trayIcon from './mainProcess/trayIcon';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  await app.whenReady();

  const reduxStore = await createMainReduxStore(rootSaga);
  setReduxStore(reduxStore);

  await i18next.init(await getI18nextInitOptions(app.getLocale()));

  createRootWindow();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }

  setupNotifications();
  setupNavigation();

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
};

if (require.main === module) {
  start();
}
