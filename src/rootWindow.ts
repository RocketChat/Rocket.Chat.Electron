import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setReduxStore } from './common/store';
import { App } from './rendererProcess/components/App';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupI18n } from './rendererProcess/setupI18n';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();
  setReduxStore(reduxStore);

  await whenReady();

  setupRendererErrorHandling('rootWindow');
  await setupI18n();

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
