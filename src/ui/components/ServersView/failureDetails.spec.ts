import type { ServerFailure } from '../../../servers/common';
import { formatFailureDetails } from './failureDetails';

const environment = {
  appVersion: '4.19.0',
  electronVersion: '37.2.0',
  platform: 'win32',
  osVersion: '10.0.22631',
};

describe('formatFailureDetails', () => {
  it('lists the load error with the app and OS versions', () => {
    const failure: ServerFailure = {
      kind: 'load-failed',
      at: '2026-11-03T12:00:00.000Z',
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      url: 'https://chat.example.com/',
      logsPath: 'C:\\Users\\me\\AppData\\Roaming\\Rocket.Chat\\logs',
    };

    expect(
      formatFailureDetails('https://chat.example.com/', failure, environment)
    ).toBe(
      [
        'Rocket.Chat Desktop: server failed to load',
        'Time: 2026-11-03T12:00:00.000Z',
        'Server: https://chat.example.com/',
        'Failure: load-failed',
        'Error: ERR_NAME_NOT_RESOLVED (-105)',
        'URL: https://chat.example.com/',
        'App version: 4.19.0',
        'Electron: 37.2.0',
        'OS: win32 10.0.22631',
        'Logs: C:\\Users\\me\\AppData\\Roaming\\Rocket.Chat\\logs',
      ].join('\n')
    );
  });

  it('lists the reason and exit code of a renderer that is gone', () => {
    const details = formatFailureDetails(
      'https://chat.example.com/',
      {
        kind: 'renderer-gone',
        at: '2026-11-03T12:00:00.000Z',
        reason: 'crashed',
        exitCode: 11,
      },
      environment
    );

    expect(details).toContain('Failure: renderer-gone');
    expect(details).toContain('Reason: crashed');
    expect(details).toContain('Exit code: 11');
    expect(details).not.toContain('Error:');
    expect(details).not.toContain('URL:');
  });

  it('leaves out values that are not known', () => {
    const details = formatFailureDetails(
      'https://chat.example.com/',
      { kind: 'unresponsive', at: '2026-11-03T12:00:00.000Z' },
      {
        appVersion: null,
        electronVersion: undefined,
        platform: 'linux',
        osVersion: undefined,
      }
    );

    expect(details).not.toContain('App version');
    expect(details).not.toContain('Electron');
    expect(details).toContain('OS: linux');
  });
});
