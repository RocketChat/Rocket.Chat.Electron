import Bugsnag from '@bugsnag/js';
import { app } from 'electron';

import { redactHomePaths, redactSensitiveData } from './logging/privacy';
import { select, listen } from './store';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from './ui/actions';

type AppType = 'main' | 'rootWindow';

const redactForReport = (text: string): string =>
  redactHomePaths(redactSensitiveData(text));

const DEFAULT_CRITICAL_PATTERNS = [
  'FATAL',
  'Cannot access native module',
  'Electron internal error',
];

export type CriticalErrorMatcher = (error: Error) => boolean;

let _criticalMatcher: CriticalErrorMatcher | null = null;

/**
 * Set a custom critical error matcher. Returns a cleanup function that restores the previous matcher.
 * @param fn - Custom matcher function or null to reset to default
 * @returns Cleanup function that restores the previous matcher
 * @example
 * const restore = setCriticalErrorMatcher((err) => err.message.includes('FATAL'));
 * try {
 *   // ... code that might throw ...
 * } finally {
 *   restore(); // Restores previous matcher
 * }
 */
export const setCriticalErrorMatcher = (
  fn: CriticalErrorMatcher | null
): (() => void) => {
  const previous = _criticalMatcher;
  _criticalMatcher = fn;

  return () => {
    _criticalMatcher = previous;
  };
};

const isCriticalError = (error: Error): boolean => {
  if (_criticalMatcher) {
    try {
      return _criticalMatcher(error);
    } catch (matcherError) {
      console.error('Critical error matcher failed:', matcherError);
      // Fall through to default behavior
    }
  }

  return DEFAULT_CRITICAL_PATTERNS.some(
    (pattern) =>
      error.message?.includes(pattern) || error.stack?.includes(pattern)
  );
};

let _globalHandlersBound = false;

const setupGlobalErrorHandlers = (): void => {
  if (_globalHandlersBound) return;

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);

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
    autoTrackSessions: false,
    onError: (event) => {
      if (!select(({ isReportEnabled }) => isReportEnabled)) {
        return false;
      }
      for (const error of event.errors) {
        error.errorMessage = redactForReport(error.errorMessage);
        for (const frame of error.stacktrace) {
          frame.file = redactForReport(frame.file);
        }
      }
      for (const breadcrumb of event.breadcrumbs) {
        breadcrumb.message = redactForReport(breadcrumb.message);
        for (const [key, value] of Object.entries(breadcrumb.metadata ?? {})) {
          if (typeof value === 'string') {
            breadcrumb.metadata[key] = redactForReport(value);
          }
        }
      }
      if (event.context) {
        event.context = redactForReport(event.context);
      }
      return true;
    },
    // The app's uncaughtException handler decides whether to quit.
    onUncaughtException: () => undefined,
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

    if (isReportEnabled && !process.mas) {
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
