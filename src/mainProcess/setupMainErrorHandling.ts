import { app, dialog } from 'electron';

import { setupBugsnag } from '../common/setupBugsnag';

export const setupMainErrorHandling = (): void => {
  if (process.env.BUGSNAG_API_KEY) {
    setupBugsnag(process.env.BUGSNAG_API_KEY, app.getVersion(), 'main');
    return;
  }

  process.addListener('uncaughtException', (error) => {
    dialog.showErrorBox(error.name, error.message);
    app.exit(1);
  });

  process.addListener('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    dialog.showErrorBox(error.name, error.message);
    app.exit(1);
  });
};
