import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './components/App';
import { setupErrorHandling } from './rootWindow/errors';
import { setupI18next } from './rootWindow/i18n';
import { createRendererReduxStore, getReduxStore } from './store';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupErrorHandling();
  await setupI18next();

  const container = document.getElementById('root');

  const reduxStore = getReduxStore();

  render(createElement(App, { reduxStore }), container);

  window.addEventListener('beforeunload', () => {
    unmountComponentAtNode(container);
  });
};

start();
