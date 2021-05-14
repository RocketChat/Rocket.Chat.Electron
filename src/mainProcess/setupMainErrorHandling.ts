import { app } from 'electron';

import { APP_ERROR_THROWN } from '../common/actions/appActions';
import { setupBugsnag } from '../common/setupBugsnag';
import { listen } from '../common/store';

export const setupMainErrorHandling = async (): Promise<void> => {
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

  await app.whenReady();

  listen(APP_ERROR_THROWN, (action) => {
    console.error(action.payload);
  });
};
