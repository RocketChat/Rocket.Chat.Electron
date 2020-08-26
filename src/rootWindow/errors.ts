import Bugsnag from '@bugsnag/js';
import { Effect, select, call } from 'redux-saga/effects';

import { APP_ERROR_THROWN } from '../actions';
import { selectAppVersion } from '../selectors';
import { dispatch } from '../store';

const setupBugsnag = (apiKey: string, appVersion: string): void => {
  Bugsnag.start({
    apiKey,
    appVersion,
    appType: 'rootWindow',
    collectUserIp: false,
    releaseStage: process.env.NODE_ENV,
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
  });
};

export function *attachErrorHandling(): Generator<Effect, void> {
  if (process.env.BUGSNAG_API_KEY) {
    const apiKey = process.env.BUGSNAG_API_KEY;
    const appVersion = yield select(selectAppVersion);
    yield call(() => setupBugsnag(apiKey, appVersion as string));
    return;
  }

  yield call(() => {
    window.addEventListener('error', handleErrorEvent);
    window.addEventListener('unhandledrejection', handleUnhandledRejectionEvent);
  });
}
