import Bugsnag from '@bugsnag/js';

import { select, listen } from './store';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from './ui/actions';

type AppType = 'main' | 'rootWindow';

const initBugsnag = (apiKey: string, appVersion: string, appType: AppType) =>
  Bugsnag.start({
    apiKey,
    appVersion,
    appType,
    releaseStage: process.env.NODE_ENV,
  });

const listenToBugsnagEnabledToggle = async (appType: AppType) => {
  const apiKey = process.env.BUGSNAG_API_KEY;
  if (!apiKey) {
    return;
  }
  const { appVersion, isReportEnabled } = select(
    ({ appVersion, isReportEnabled }) => ({ appVersion, isReportEnabled })
  );
  if (!appVersion) {
    throw new Error('app version was not set');
  }

  const bugsnagInstance = initBugsnag(apiKey, appVersion, appType);

  isReportEnabled && bugsnagInstance.startSession();
  listen(SETTINGS_SET_REPORT_OPT_IN_CHANGED, async (action) => {
    const isReportEnabled = action.payload;
    if (isReportEnabled) {
      bugsnagInstance.startSession();
    } else {
      bugsnagInstance.pauseSession();
    }
  });
};

export const setupRendererErrorHandling = async (
  appType: AppType
): Promise<void> => {
  listenToBugsnagEnabledToggle(appType);
};

export const setupMainErrorHandling = async (): Promise<void> =>
  setupRendererErrorHandling('main');
