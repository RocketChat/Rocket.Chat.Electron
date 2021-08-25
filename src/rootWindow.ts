import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setupRendererErrorHandling } from './errors';
import { setupI18n } from './i18n/renderer';
import { createRendererReduxStore } from './store';
import { App } from './ui/components/App';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('rootWindow');
  await setupI18n();

  (
    await Promise.all([
      import('./notifications/renderer'),
      import('./servers/renderer'),
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
