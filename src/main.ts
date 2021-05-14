import { app } from 'electron';
import i18next from 'i18next';

import {
  I18N_LNG_REQUESTED,
  I18N_LNG_RESPONDED,
} from './common/actions/i18nActions';
import { fallbackTranslationLanguage } from './common/fallbackTranslationLanguage';
import { hasMeta } from './common/fsa';
import { getInitialState } from './common/getInitialState';
import { getTranslationLanguage } from './common/getTranslationLanguage';
import i18nResources from './common/i18nResources';
import { interpolation } from './common/interpolation';
import { isTranslationLanguage } from './common/isTranslationLanguage';
import { dispatch, listen, setReduxStore } from './common/store';
import { createMainReduxStore } from './mainProcess/createMainReduxStore';
import {
  setupDeepLinks,
  processDeepLinksInArgs,
} from './mainProcess/deepLinks';
import { setUserDataDirectory } from './mainProcess/dev';
import dock from './mainProcess/dock';
import { setupDownloads } from './mainProcess/downloads';
import { extractLocalStorage } from './mainProcess/extractLocalStorage';
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

  const lng = getTranslationLanguage(app.getLocale());

  await i18next.init({
    lng,
    fallbackLng: fallbackTranslationLanguage,
    resources: {
      ...(lng &&
        lng in i18nResources && {
          [lng]: {
            translation: await i18nResources[lng](),
          },
        }),
      [fallbackTranslationLanguage]: {
        translation: await i18nResources[fallbackTranslationLanguage](),
      },
    },
    interpolation,
    initImmediate: true,
  });

  const localStorage = await extractLocalStorage();

  await Promise.resolve(getInitialState())
    .then((state) => mergePersistableValues(state, localStorage))
    .then((state) => mergeServers(state, localStorage))
    .then((state) => mergeUpdatesConfiguration(state))
    .then((state) => mergeTrustedCertificates(state));

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

  listen(I18N_LNG_REQUESTED, (action) => {
    if (!hasMeta(action) || !action.meta.id) {
      return;
    }

    dispatch({
      type: I18N_LNG_RESPONDED,
      payload: isTranslationLanguage(i18next.language)
        ? i18next.language
        : fallbackTranslationLanguage,
      meta: {
        response: true,
        id: action.meta?.id,
      },
    });
  });

  await processDeepLinksInArgs();
};

if (require.main === module) {
  start();
}
