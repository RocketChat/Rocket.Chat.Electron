import fs from 'fs';

import { detectPickerType } from './createScreenPicker';

jest.mock('./providers/PortalPickerProvider', () => ({
  PortalPickerProvider: class {},
}));

jest.mock('./providers/InternalPickerProvider', () => ({
  InternalPickerProvider: class {},
}));

jest.mock('fs', () => ({
  statSync: jest.fn(),
}));

const statSyncMock = fs.statSync as jest.Mock;

const ENV_KEYS = [
  'XDG_SESSION_TYPE',
  'XDG_CURRENT_DESKTOP',
  'WAYLAND_DISPLAY',
  'XDG_RUNTIME_DIR',
  'ROCKETCHAT_INTERNAL_SCREEN_PICKER',
];

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
};

describe('detectPickerType', () => {
  const originalPlatform = process.platform;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    ENV_KEYS.forEach((key) => {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    });
    statSyncMock.mockReset();
    // Default: no wayland socket on disk.
    statSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });
  });

  afterEach(() => {
    setPlatform(originalPlatform);
    ENV_KEYS.forEach((key) => {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    });
  });

  it("returns 'portal' on linux with no XDG env at all (sandbox)", () => {
    setPlatform('linux');
    expect(detectPickerType()).toBe('portal');
  });

  it("returns 'portal' on linux when XDG_SESSION_TYPE=wayland", () => {
    setPlatform('linux');
    process.env.XDG_SESSION_TYPE = 'wayland';
    expect(detectPickerType()).toBe('portal');
  });

  it("returns 'portal' on linux when WAYLAND_DISPLAY is set and the socket exists (Flatpak-Wayland, session type stripped)", () => {
    setPlatform('linux');
    process.env.WAYLAND_DISPLAY = 'wayland-0';
    process.env.XDG_RUNTIME_DIR = '/run/user/1000';
    statSyncMock.mockImplementation((path: string) => {
      if (path === '/run/user/1000/wayland-0') {
        return { isSocket: () => true };
      }
      throw new Error('ENOENT');
    });
    expect(detectPickerType()).toBe('portal');
  });

  it("returns 'internal' on linux when XDG_SESSION_TYPE=x11", () => {
    setPlatform('linux');
    process.env.XDG_SESSION_TYPE = 'x11';
    expect(detectPickerType()).toBe('internal');
  });

  it("returns 'internal' when ROCKETCHAT_INTERNAL_SCREEN_PICKER=1 overrides everything", () => {
    setPlatform('linux');
    process.env.ROCKETCHAT_INTERNAL_SCREEN_PICKER = '1';
    process.env.XDG_SESSION_TYPE = 'wayland';
    expect(detectPickerType()).toBe('internal');
  });

  it("returns 'internal' on darwin", () => {
    setPlatform('darwin');
    expect(detectPickerType()).toBe('internal');
  });

  it("returns 'internal' on win32", () => {
    setPlatform('win32');
    expect(detectPickerType()).toBe('internal');
  });
});
