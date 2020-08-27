import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './components/App';
import { setupRendererErrorHandling } from './errors';
import { setupI18next } from './rootWindow/i18n';
import { createRendererReduxStore } from './store';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('rootWindow');
  await setupI18next();

  const container = document.getElementById('root');

  render(createElement(App, { reduxStore }), container);

  window.addEventListener('beforeunload', () => {
    unmountComponentAtNode(container);
  });
};

start();
