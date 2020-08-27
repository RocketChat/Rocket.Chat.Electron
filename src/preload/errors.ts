import Bugsnag from '@bugsnag/js';

import { APP_ERROR_THROWN } from '../actions';
import { dispatch, select } from '../store';

const setupBugsnag = (apiKey: string, appVersion: string): void => {
  Bugsnag.start({
    apiKey,
    appVersion,
    appType: 'webviewPreload',
    collectUserIp: false,
    releaseStage: process.env.NODE_ENV,
    onError: (event) => {
      event.context = window.location.href;
    },
  });
};

const handleErrorEvent = (event: ErrorEvent): void => {
  const { error } = event;
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

const handleUnhandledRejectionEvent = (event: PromiseRejectionEvent): void => {
  const { reason } = event;
  dispatch({
    type: APP_ERROR_THROWN,
    payload: {
      message: reason.message,
      stack: reason.stack,
      name: reason.name,
    },
    error: true,
  });
};

export const setupErrorHandling = (): void => {
  if (process.env.BUGSNAG_API_KEY) {
    const apiKey = process.env.BUGSNAG_API_KEY;
    const appVersion = select(({ appVersion }) => appVersion);
    setupBugsnag(apiKey, appVersion);
    return;
  }

  window.addEventListener('error', handleErrorEvent);
  window.addEventListener('unhandledrejection', handleUnhandledRejectionEvent);
};
