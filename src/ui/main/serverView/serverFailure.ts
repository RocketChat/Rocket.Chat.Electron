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

type ServerFailureInput = Omit<ServerFailure, 'at' | 'logsPath' | 'since'>;

export const createServerFailure = ({
  url,
  ...failure
}: ServerFailureInput): ServerFailure => {
  const logsPath = getLogsPath();
  return {
    ...failure,
    ...(url !== undefined && { url: withoutUrlSecrets(url) }),
    at: new Date().toISOString(),
    ...(logsPath !== undefined && { logsPath }),
  };
};

/**
 * Creates the failures of one server view. While the page does not load, each
 * automatic reload fails again with a new time. The tracker keeps the time of
 * the first of those failures as `since`, until `clear` is called when the
 * page loads or recovers.
 */
export const createServerFailureTracker = () => {
  let failingSince: string | undefined;

  return {
    create: (input: ServerFailureInput): ServerFailure => {
      const failure = createServerFailure(input);
      failingSince ??= failure.at;
      return failingSince === failure.at
        ? failure
        : { ...failure, since: failingSince };
    },
    clear: (): void => {
      failingSince = undefined;
    },
  };
};
