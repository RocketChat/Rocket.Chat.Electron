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
  },
});
