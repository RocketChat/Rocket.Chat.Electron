import { app } from 'electron';

import { APP_PATH_SET, APP_VERSION_SET } from '../common/actions/appActions';
import { dispatch } from '../common/store';
import { getRootWindow } from './rootWindow';

export const setupApp = (): void => {
  app.addListener('activate', async () => {
    const browserWindow = await getRootWindow();

    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();
  });

  app.addListener('window-all-closed', (): void => undefined);

  dispatch({ type: APP_PATH_SET, payload: app.getAppPath() });
  dispatch({ type: APP_VERSION_SET, payload: app.getVersion() });
};
