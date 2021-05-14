import { app } from 'electron';

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
};
