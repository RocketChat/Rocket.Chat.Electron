import { app } from 'electron';

import { setupBugsnag } from '../common/setupBugsnag';

export const setupMainErrorHandling = (): void => {
  if (process.env.BUGSNAG_API_KEY) {
    setupBugsnag(process.env.BUGSNAG_API_KEY, app.getVersion(), 'main');
    return;
  }

  process.addListener('uncaughtException', (error) => {
    console.error(error);
    app.exit(1);
  });

  process.addListener('unhandledRejection', (reason) => {
    console.error(reason);
    app.exit(1);
  });
};
