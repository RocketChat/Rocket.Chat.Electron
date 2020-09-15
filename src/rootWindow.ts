import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setupRendererErrorHandling } from './errors';
import { setupI18n } from './i18n/renderer';
import { createRendererReduxStore } from './store';
import { App } from './ui/components/App';
import { setupRootWindowIcon } from './ui/rootWindow/icon';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('rootWindow');
  await setupI18n();
  setupRootWindowIcon();

  const container = document.getElementById('root');

  render(createElement(App, { reduxStore }), container);

  window.addEventListener('beforeunload', () => {
    unmountComponentAtNode(container);
  });
};

start();
