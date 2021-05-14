import { setupBugsnag } from '../common/setupBugsnag';
import { select } from '../store';
import { whenReady } from './whenReady';

export const setupRendererErrorHandling = async (
  appType: 'rootWindow' | 'webviewPreload'
): Promise<void> => {
  await whenReady();

  if (process.env.BUGSNAG_API_KEY) {
    const apiKey = process.env.BUGSNAG_API_KEY;
    const appVersion = select(({ appVersion }) => appVersion);

    if (!appVersion) {
      throw new Error('app version was not set');
    }

    setupBugsnag(apiKey, appVersion, appType);
  }
};
