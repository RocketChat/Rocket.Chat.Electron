import { ipcRenderer } from 'electron';
import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setupRendererErrorHandling } from './errors';
import { setupI18n } from './i18n/renderer';
import { createRendererReduxStore } from './store';
import { App } from './ui/components/App';
import { setupRootWindowIcon } from './ui/rootWindow/icon';
import { whenReady } from './whenReady';

ipcRenderer.on('fetch-server-info', async (_, id: string, urlHref: string): Promise<void> => {
  try {
    const url = new URL(urlHref);

    const { username, password } = url;
    const headers = new Headers();

    if (username && password) {
      headers.append('Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`);
    }

    const endpoint = new URL('api/info', url);

    const response = await fetch(endpoint.href, { headers });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const responseBody: {
      success: boolean;
      version: string;
    } = await response.json();

    if (!responseBody.success) {
      throw new Error();
    }

    ipcRenderer.send(`fetch-server-info@${ id }`, { resolved: [new URL('../..', response.url).href, responseBody.version] });
  } catch (error) {
    ipcRenderer.send(`fetch-server-info@${ id }`, {
      rejected: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

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
