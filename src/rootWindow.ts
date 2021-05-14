import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './rendererProcess/components/App';
import { setupI18n } from './rendererProcess/setupI18n';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';
import { createRendererReduxStore } from './store';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();

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
