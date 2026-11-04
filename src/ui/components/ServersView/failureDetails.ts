import type { ServerFailure } from '../../../servers/common';
import { withoutUrlSecrets } from '../../../servers/withoutUrlSecrets';

export type FailureEnvironment = {
  appVersion: string | null;
  electronVersion: string | undefined;
  platform: string;
  osVersion: string | undefined;
};

export const getFailureEnvironment = (
  appVersion: string | null
): FailureEnvironment => ({
  appVersion,
  electronVersion: process.versions.electron,
  platform: process.platform,
  osVersion:
    typeof process.getSystemVersion === 'function'
      ? process.getSystemVersion()
      : undefined,
});

// The report goes to support as it is, so it stays in English whatever the
// app language is.
export const formatFailureDetails = (
  serverUrl: string,
  failure: ServerFailure,
  environment: FailureEnvironment
): string => {
  const error =
    failure.errorDescription !== undefined || failure.errorCode !== undefined
      ? [
          failure.errorDescription,
          failure.errorCode !== undefined && `(${failure.errorCode})`,
        ]
          .filter(Boolean)
          .join(' ')
      : undefined;

  const lines: [string, string | number | null | undefined][] = [
    ['Time', failure.at],
    ['Server', withoutUrlSecrets(serverUrl)],
    ['Failure', failure.kind],
    ['Error', error],
    ['URL', failure.url],
    ['Reason', failure.reason],
    ['Exit code', failure.exitCode],
    ['App version', environment.appVersion],
    ['Electron', environment.electronVersion],
    [
      'OS',
      [environment.platform, environment.osVersion].filter(Boolean).join(' '),
    ],
    ['Logs', failure.logsPath],
  ];

  return [
    'Rocket.Chat Desktop: server failed to load',
    ...lines
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
      .map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
};
