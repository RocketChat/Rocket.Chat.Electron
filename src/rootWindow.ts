import i18next from 'i18next';
import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { initReactI18next } from 'react-i18next';

import { getI18nextInitOptions } from './common/getI18nextInitOptions';
import { setReduxStore } from './common/store';
import { handle } from './ipc/renderer';
import { App } from './rendererProcess/components/App';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { resolveServerUrl } from './rendererProcess/resolveServerUrl';
import { rootSaga } from './rendererProcess/sagas';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore(rootSaga);
  setReduxStore(reduxStore);

  await whenReady();

  await i18next
    .use(initReactI18next)
    .init(await getI18nextInitOptions(reduxStore.getState().app.locale));

  handle('servers/resolve-url', resolveServerUrl);

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
