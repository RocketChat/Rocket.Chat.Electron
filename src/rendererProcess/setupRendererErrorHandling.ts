import { setupBugsnag } from '../common/setupBugsnag';
import { select } from '../common/store';

export const setupRendererErrorHandling = async (
  appType: 'rootWindow' | 'webviewPreload'
): Promise<void> => {
  const { appVersion, bugsnagApiKey } = select((state) => ({
    appVersion: state.app.version,
    bugsnagApiKey: state.app.bugsnagApiKey,
  }));

  if (bugsnagApiKey) {
    setupBugsnag(bugsnagApiKey, appVersion, appType);
  }
};
