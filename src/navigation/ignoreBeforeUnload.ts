import type { WebContents } from 'electron';
import { app } from 'electron';

import { loggers } from '../logging/scopes';

const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return 'unknown';
  }
};

const ignoreBeforeUnload = (webContents: WebContents): void => {
  webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
    loggers.main.info('Ignored a beforeunload handler', {
      type: webContents.getType(),
      origin: originOf(webContents.getURL()),
    });
  });
};

// Electron has no "Leave this site?" dialog: when a page cancels
// `beforeunload`, Electron cancels the navigation, reload, window close or app
// quit and shows nothing. A page that a Custom Script or a third party
// controls must not block the app, so every webContents ignores the handler.
// Register this before the first window is created.
export const setupIgnoreBeforeUnload = (): void => {
  app.on('web-contents-created', (_event, webContents) => {
    ignoreBeforeUnload(webContents);
  });
};
