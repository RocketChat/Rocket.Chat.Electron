import { app } from 'electron';
import i18next from 'i18next';
import React from 'react';

import { getI18nextInitOptions } from './common/getI18nextInitOptions';
import { setReduxStore } from './common/store';
import AppRoot from './mainProcess/components/AppRoot';
import { createMainReduxStore } from './mainProcess/createMainReduxStore';
import { setUserDataDirectory } from './mainProcess/dev';
import menuBar from './mainProcess/menuBar';
import { performElectronStartup } from './mainProcess/performElectronStartup';
import { createRootWindow, showRootWindow } from './mainProcess/rootWindow';
import { rootSaga } from './mainProcess/sagas';
import { attachGuestWebContentsEvents } from './mainProcess/serverView';
import { setupMainErrorHandling } from './mainProcess/setupMainErrorHandling';
import touchBar from './mainProcess/touchBar';
import trayIcon from './mainProcess/trayIcon';
import { render } from './nullReconciler';

const start = async (): Promise<void> => {
  setUserDataDirectory();
  setupMainErrorHandling();
  performElectronStartup();

  await app.whenReady();

  const store = await createMainReduxStore(rootSaga);
  setReduxStore(store);

  await i18next.init(await getI18nextInitOptions(app.getLocale()));

  createRootWindow();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }

  render(<AppRoot store={store} />);

  menuBar.setUp();
  touchBar.setUp();
  trayIcon.setUp();

  app.addListener('before-quit', () => {
    menuBar.tearDown();
    touchBar.tearDown();
    trayIcon.tearDown();
  });
};

if (require.main === module) {
  start();
}
