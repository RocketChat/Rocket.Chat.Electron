import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  getAppOverriddenSettingsPath,
  getUserDataOverriddenSettingsPath,
  readOverriddenSettingsSync,
} from './overriddenSettings';

let mockUserDataPath = '';
let mockAppPath = '';

jest.mock('electron', () => ({
  app: {
    getPath: () => mockUserDataPath,
    getAppPath: () => mockAppPath,
  },
}));

describe('overriddenSettings', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'overridden-settings-'));
    mockUserDataPath = path.join(root, 'userData');
    mockAppPath = path.join(root, 'resources', 'app.asar');
    fs.mkdirSync(mockUserDataPath, { recursive: true });
    fs.mkdirSync(mockAppPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const write = (filePath: string, content: string) =>
    fs.writeFileSync(filePath, content, 'utf8');

  it('finds the app file next to app.asar, not inside it', () => {
    expect(getAppOverriddenSettingsPath()).toBe(
      path.join(root, 'resources', 'overridden-settings.json')
    );
    expect(getUserDataOverriddenSettingsPath()).toBe(
      path.join(mockUserDataPath, 'overridden-settings.json')
    );
  });

  it('returns no overrides when neither file exists', () => {
    expect(readOverriddenSettingsSync()).toEqual({});
  });

  it('merges both files, and the app file wins', () => {
    write(
      getUserDataOverriddenSettingsPath(),
      JSON.stringify({
        isHardwareAccelerationEnabled: true,
        isTransparentWindowEnabled: true,
      })
    );
    write(
      getAppOverriddenSettingsPath(),
      JSON.stringify({ isHardwareAccelerationEnabled: false })
    );

    expect(readOverriddenSettingsSync()).toEqual({
      isHardwareAccelerationEnabled: false,
      isTransparentWindowEnabled: true,
    });
  });

  it('ignores a file that is not a JSON object', () => {
    write(getUserDataOverriddenSettingsPath(), '{ not json');
    write(getAppOverriddenSettingsPath(), '[false]');

    expect(readOverriddenSettingsSync()).toEqual({});
  });
});
