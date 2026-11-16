import fs from 'fs';
import path from 'path';

import { app } from 'electron';

import { getAppConfigFilePath } from './appConfigFile';

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

const getAppPathMock = app.getAppPath as jest.MockedFunction<
  typeof app.getAppPath
>;
const existsSyncMock = fs.existsSync as jest.MockedFunction<
  typeof fs.existsSync
>;

const originalPlatform = process.platform;

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { value: platform });
};

describe('getAppConfigFilePath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAppPathMock.mockReturnValue(
      path.join('/opt', 'Rocket.Chat', 'resources', 'app.asar')
    );
    existsSyncMock.mockReturnValue(false);
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('returns the file next to app.asar', () => {
    setPlatform('linux');

    expect(getAppConfigFilePath('servers.json')).toBe(
      path.join('/opt', 'Rocket.Chat', 'resources', 'servers.json')
    );
  });

  it('returns the file inside the app folder when the app is not packaged', () => {
    setPlatform('win32');
    getAppPathMock.mockReturnValue(path.join('/repo', 'app'));

    expect(getAppConfigFilePath('overridden-settings.json')).toBe(
      path.join('/repo', 'app', 'overridden-settings.json')
    );
  });

  it('ignores /Library/Preferences on other platforms', () => {
    setPlatform('linux');
    existsSyncMock.mockReturnValue(true);

    expect(getAppConfigFilePath('servers.json')).toBe(
      path.join('/opt', 'Rocket.Chat', 'resources', 'servers.json')
    );
    expect(existsSyncMock).not.toHaveBeenCalled();
  });

  it('prefers /Library/Preferences on macOS when the file exists there', () => {
    setPlatform('darwin');
    existsSyncMock.mockReturnValue(true);

    expect(getAppConfigFilePath('overridden-settings.json')).toBe(
      path.join(
        '/Library/Preferences',
        'Rocket.Chat',
        'overridden-settings.json'
      )
    );
  });

  it('falls back to the app bundle on macOS when /Library/Preferences has no file', () => {
    setPlatform('darwin');
    getAppPathMock.mockReturnValue(
      '/Applications/Rocket.Chat.app/Contents/Resources/app.asar'
    );

    expect(getAppConfigFilePath('overridden-settings.json')).toBe(
      path.join(
        '/Applications/Rocket.Chat.app/Contents/Resources',
        'overridden-settings.json'
      )
    );
    expect(existsSyncMock).toHaveBeenCalledWith(
      path.join(
        '/Library/Preferences',
        'Rocket.Chat',
        'overridden-settings.json'
      )
    );
  });
});
