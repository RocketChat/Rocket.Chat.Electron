import Bugsnag from '@bugsnag/js';
import { app } from 'electron';

import { APP_ERROR_THROWN } from './app/actions';
import { select, dispatch, listen } from './store';
import { whenReady } from './whenReady';

type AppType = 'main' | 'rootWindow' | 'webviewPreload';

const setupBugsnag = (apiKey: string, appVersion: string, appType: AppType): void => {
  Bugsnag.start({
    apiKey,
    appVersion,
    appType,
    collectUserIp: false,
    releaseStage: process.env.NODE_ENV,
    ...appType === 'webviewPreload' && {
      onError: (event) => {
        event.context = window.location.href;
      },
    },
  });
};

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

export const setupRendererErrorHandling = async (appType: AppType): Promise<void> => {
  await whenReady();

  if (process.env.BUGSNAG_API_KEY) {
    const apiKey = process.env.BUGSNAG_API_KEY;
    const appVersion = select(({ appVersion }) => appVersion);
    setupBugsnag(apiKey, appVersion, appType);
    return;
  }

  const dispatchError = (error: Error): void => {
    dispatch({
      type: APP_ERROR_THROWN,
      payload: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      error: true,
    });
  };

  window.addEventListener('error', (event): void => {
    dispatchError(event.error);
  });

  window.addEventListener('unhandledrejection', (event): void => {
    dispatchError(event.reason);
  });
};
