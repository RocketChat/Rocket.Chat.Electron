import Bugsnag from '@bugsnag/js';
import { app } from 'electron';

import { select, listen } from './store';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from './ui/actions';

type AppType = 'main' | 'rootWindow';

const isCriticalError = (error: Error): boolean => {
  const criticalPatterns = [
    'FATAL',
    'Cannot access native module',
    'Electron internal error',
  ];

  return criticalPatterns.some(
    (pattern) =>
      error.message?.includes(pattern) || error.stack?.includes(pattern)
  );
};

let _globalHandlersBound = false;

const setupGlobalErrorHandlers = (): void => {
  if (_globalHandlersBound) return;

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);

    if (Bugsnag.isStarted()) {
      Bugsnag.notify(error);
    }

    if (isCriticalError(error)) {
      console.error('Critical error detected, app cannot continue');
      app.quit();
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error =
      reason instanceof Error
        ? reason
        : new Error(`Unhandled Promise Rejection: ${String(reason)}`);

    console.error('Unhandled Promise Rejection:', error);

    if (Bugsnag.isStarted()) {
      Bugsnag.notify(error);
    }

    if (isCriticalError(error)) {
      console.error('Critical promise rejection, app cannot continue');
      app.quit();
    }
  });

  _globalHandlersBound = true;
};

const initBugsnag = (apiKey: string, appVersion: string, appType: AppType) =>
  Bugsnag.start({
    apiKey,
    appVersion,
    appType,
    releaseStage: process.env.NODE_ENV,
    redactedKeys: [/\/Users\/[^\/]+/],
  });

const listenToBugsnagEnabledToggle = async (appType: AppType) => {
  const apiKey = process.env.BUGSNAG_API_KEY;
  if (!apiKey) {
    return;
  }
  const { appVersion, isReportEnabled } = select(
    ({ appVersion, isReportEnabled }) => ({ appVersion, isReportEnabled })
  );
  const effectiveVersion = appVersion || app.getVersion();
  if (!effectiveVersion) {
    console.warn('Bugsnag init deferred: app version not available yet');
    return;
  }

  let bugsnagInstance: ReturnType<typeof initBugsnag>;

  if (isReportEnabled && !process.mas) {
    bugsnagInstance = initBugsnag(apiKey, effectiveVersion, appType);
    bugsnagInstance.startSession();
  }

  listen(SETTINGS_SET_REPORT_OPT_IN_CHANGED, async (action) => {
    const isReportEnabled = action.payload;

    if (isReportEnabled) {
      bugsnagInstance =
        bugsnagInstance || initBugsnag(apiKey, effectiveVersion, appType);
      bugsnagInstance.startSession();
    } else {
      bugsnagInstance?.pauseSession();
    }
  });
};

export const setupRendererErrorHandling = async (
  appType: AppType
): Promise<void> => {
  await listenToBugsnagEnabledToggle(appType);
};

export const setupMainErrorHandling = async (): Promise<void> => {
  setupGlobalErrorHandlers();
  await setupRendererErrorHandling('main');
};
