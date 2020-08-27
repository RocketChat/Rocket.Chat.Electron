import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './components/App';
import { setupRendererErrorHandling } from './errors';
import { setupI18n } from './i18n/renderer';
import { createRendererReduxStore } from './store';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  const reduxStore = await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('rootWindow');
  await setupI18n();

  const container = document.getElementById('root');

  render(createElement(App, { reduxStore }), container);

  window.addEventListener('beforeunload', () => {
    unmountComponentAtNode(container);
  });
};

start();
