import { app } from 'electron';

import type { ServerFailure } from '../../../servers/common';

// The failure is saved with the server list and copied into support tickets,
// and a query string or fragment can hold a login code or a token.
export const withoutUrlSecrets = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url.split(/[?#]/, 1)[0];
  }
};

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
