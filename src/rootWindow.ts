import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

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

  const root = createRoot(container);

  root.render(createElement(App, { reduxStore }));

  window.addEventListener('beforeunload', () => {
    root.unmount();
  });
};

start();
