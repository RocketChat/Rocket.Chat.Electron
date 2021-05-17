import { app } from 'electron';

import type { RootState } from '../common/types/RootState';

export const mergeAppInformation = async (
  state: RootState
): Promise<RootState> => ({
  ...state,
  app: {
    name: app.getName(),
    version: app.getVersion(),
    path: app.getAppPath(),
    platform: process.platform,
    locale: app.getLocale(),
    bugsnagApiKey: process.env.BUGSNAG_API_KEY,
  },
  ui: {
    ...state.ui,
    trayIcon: {
      ...state.ui.trayIcon,
      enabled: process.platform !== 'linux',
    },
  },
});
