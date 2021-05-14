import Bugsnag from '@bugsnag/js';

export const setupBugsnag = (
  apiKey: string,
  appVersion: string,
  appType: 'main' | 'rootWindow' | 'webviewPreload'
): void => {
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
};
