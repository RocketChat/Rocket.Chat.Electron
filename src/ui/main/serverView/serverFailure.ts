import { app } from 'electron';

import type { ServerFailure } from '../../../servers/common';
import { withoutUrlSecrets } from '../../../servers/withoutUrlSecrets';

const getLogsPath = (): string | undefined => {
  try {
    return app.getPath('logs');
  } catch {
    return undefined;
  }
};

export const createServerFailure = ({
  url,
  ...failure
}: Omit<ServerFailure, 'at' | 'logsPath'>): ServerFailure => {
  const logsPath = getLogsPath();
  return {
    ...failure,
    ...(url !== undefined && { url: withoutUrlSecrets(url) }),
    at: new Date().toISOString(),
    ...(logsPath !== undefined && { logsPath }),
  };
};
