import i18next from 'i18next';
import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { initReactI18next } from 'react-i18next';

import {
  I18N_LNG_REQUESTED,
  I18N_LNG_RESPONDED,
} from './common/actions/i18nActions';
import { fallbackTranslationLanguage } from './common/fallbackTranslationLanguage';
import i18nResources from './common/i18nResources';
import { interpolation } from './common/interpolation';
import { request, setReduxStore } from './common/store';
import { App } from './rendererProcess/components/App';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();
  setReduxStore(reduxStore);

  await whenReady();

  setupRendererErrorHandling('rootWindow');

  const lng =
    (await request(
      {
        type: I18N_LNG_REQUESTED,
      },
      I18N_LNG_RESPONDED
    )) ?? undefined;

  await i18next.use(initReactI18next).init({
    lng,
    fallbackLng: fallbackTranslationLanguage,
    resources: {
      ...(lng && {
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

  (
    await Promise.all([
      import('./rendererProcess/notifications'),
      import('./rendererProcess/servers'),
    ])
  ).forEach((module) => module.default());

  const container = document.getElementById('root');

  if (!container) {
    throw new Error('cannot find the container node for React');
  }

  render(createElement(App, { reduxStore }), container);

  window.addEventListener('beforeunload', () => {
    unmountComponentAtNode(container);
  });
};

start();
