import Bugsnag, { Client } from '@bugsnag/js';
import { app } from 'electron';

import { select, listen } from './store';
import { SETTINGS_SET_BUGSNAG_OPT_IN } from './ui/actions';

type AppType = 'main' | 'rootWindow' | 'webviewPreload';

const initBugsnag = (apiKey: string, appVersion: string, appType: AppType) =>
  Bugsnag.start({
    apiKey,
    appVersion,
    appType,
    collectUserIp: false,
    releaseStage: process.env.NODE_ENV,
    ...(appType === 'webviewPreload' && {
      onError: (event) => {
        event.context = window.location.href;
      },
    }),
  });

const listenToBugsnagEnabledToggle = (bugsnagInstance: Client) => {
  listen(SETTINGS_SET_BUGSNAG_OPT_IN, async (action) => {
    const isReportEnabled = action.payload;
    if (isReportEnabled) {
      bugsnagInstance.startSession();
    } else {
      bugsnagInstance.pauseSession();
    }
  });
};

export const setupMainErrorHandling = async (): Promise<void> => {
  await app.whenReady();
  const apiKey = process.env.BUGSNAG_API_KEY;
  if (apiKey) {
    const bugsnagInstance = initBugsnag(apiKey, app.getVersion(), 'main');
    listenToBugsnagEnabledToggle(bugsnagInstance);
  }
};

export const setupRendererErrorHandling = async (
  appType: AppType
): Promise<void> => {
  await app.whenReady();
  const apiKey = process.env.BUGSNAG_API_KEY;
  if (apiKey) {
    const appVersion = select(({ appVersion }) => appVersion);
    if (!appVersion) {
      throw new Error('app version was not set');
    }
    const bugsnagInstance = initBugsnag(apiKey, appVersion, appType);
    listenToBugsnagEnabledToggle(bugsnagInstance);
  }
};
