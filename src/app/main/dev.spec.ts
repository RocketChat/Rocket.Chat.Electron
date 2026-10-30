import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import type { WebContents } from 'electron';
import { app } from 'electron';

import {
  setDevelopmentAppName,
  setUserDataDirectory,
  setupRootWindowReload,
  setupPreloadReload,
} from './dev';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
    getAppPath: jest.fn(),
    setPath: jest.fn(),
    setName: jest.fn(),
    isPackaged: false,
    name: 'Rocket.Chat',
    mas: false,
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: { writeFile: jest.fn() },
  writeFileSync: jest.fn(),
}));

jest.mock('chokidar', () => {
  const mockWatch = jest.fn();
  const mockWatchOn = jest.fn();
  return {
    __mockWatch: mockWatch,
    __mockWatchOn: mockWatchOn,
    watch: (..._args: any[]) => {
      mockWatch(..._args);
      return { on: mockWatchOn };
    },
  };
});

const mockChokidar = jest.requireMock('chokidar') as {
  __mockWatch: jest.Mock;
  __mockWatchOn: jest.Mock;
};
const watchMock = mockChokidar.__mockWatch;
const watchOnMock = mockChokidar.__mockWatchOn;

describe('app/main/dev', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const appData = '/appData';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    (app.getPath as jest.Mock).mockReturnValue(appData);
    (app as any).name = 'Rocket.Chat';
    (app as any).mas = false;
    (app.getAppPath as jest.Mock).mockReturnValue('/app');
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('setUserDataDirectory', () => {
    it('does nothing outside development', () => {
      process.env.NODE_ENV = 'production';
      setUserDataDirectory();
      expect(mkdirSync).not.toHaveBeenCalled();
      expect(app.setPath).not.toHaveBeenCalled();
    });

    it('creates development userData directory when missing', () => {
      process.env.NODE_ENV = 'development';
      (existsSync as jest.Mock).mockReturnValue(false);

      setUserDataDirectory();

      const expected = path.join(appData, `${app.name} (development)`);
      expect(mkdirSync).toHaveBeenCalledWith(expected, { recursive: true });
      expect(app.setPath).toHaveBeenCalledWith('userData', expected);
    });

    it('does not create existing development directory', () => {
      process.env.NODE_ENV = 'development';
      (existsSync as jest.Mock).mockReturnValue(true);

      setUserDataDirectory();

      expect(mkdirSync).not.toHaveBeenCalled();
      expect(app.setPath).toHaveBeenCalledTimes(1);
    });
  });

  describe('setDevelopmentAppName', () => {
    const originalSwitch = process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM;

    beforeEach(() => {
      (app as any).isPackaged = false;
    });

    afterEach(() => {
      if (originalSwitch === undefined) {
        delete process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM;
      } else {
        process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM = originalSwitch;
      }
    });

    it('renames the app in development when the switch is on', () => {
      process.env.NODE_ENV = 'development';
      process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM = 'true';

      setDevelopmentAppName();

      expect(app.setName).toHaveBeenCalledWith('Rocket.Chat (development)');
    });

    it('keeps the app name when the switch is off', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM;

      setDevelopmentAppName();

      expect(app.setName).not.toHaveBeenCalled();
    });

    it('keeps the app name outside development', () => {
      process.env.NODE_ENV = 'production';
      process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM = 'true';

      setDevelopmentAppName();

      expect(app.setName).not.toHaveBeenCalled();
    });

    it('keeps the app name in a packaged app', () => {
      process.env.NODE_ENV = 'development';
      process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM = 'true';
      (app as any).isPackaged = true;

      setDevelopmentAppName();

      expect(app.setName).not.toHaveBeenCalled();
    });

    it('keeps the user data folder name when it runs after it', () => {
      process.env.NODE_ENV = 'development';
      process.env.ROCKETCHAT_DEV_KEYCHAIN_ITEM = 'true';
      (existsSync as jest.Mock).mockReturnValue(true);

      setUserDataDirectory();
      setDevelopmentAppName();

      expect(app.setPath).toHaveBeenCalledWith(
        'userData',
        path.join(appData, 'Rocket.Chat (development)')
      );
    });
  });

  it('reloads root webContents when watcher reports a change', async () => {
    const mockContents = {
      isDestroyed: jest.fn(() => false),
      reload: jest.fn(),
    } as unknown as WebContents;

    const onHandler = jest.fn((_: string, handler: () => void) => {
      if (_.includes('change')) {
        handler();
      }
    });
    (watchOnMock as jest.Mock).mockImplementation(onHandler);

    await setupRootWindowReload(mockContents);

    expect(watchMock).toHaveBeenCalledWith(
      path.join(app.getAppPath(), 'app/rootWindow.js'),
      { awaitWriteFinish: true }
    );
    expect(watchOnMock).toHaveBeenCalledWith('change', expect.any(Function));
    expect(onHandler).toHaveBeenCalled();
    expect(mockContents.reload).toHaveBeenCalledTimes(1);
  });

  it('ignores destroyed webContents on watched root change', async () => {
    const mockContents = {
      isDestroyed: jest.fn(() => true),
      reload: jest.fn(),
    } as unknown as WebContents;

    const onHandler = jest.fn((_: string, handler: () => void) => {
      if (_.includes('change')) {
        handler();
      }
    });
    (watchOnMock as jest.Mock).mockImplementation(onHandler);

    await setupRootWindowReload(mockContents);

    expect(mockContents.reload).not.toHaveBeenCalled();
  });

  it('reloads preload webContents when watcher reports a change', async () => {
    const mockContents = {
      isDestroyed: jest.fn(() => false),
      reload: jest.fn(),
    } as unknown as WebContents;

    const onHandler = jest.fn((_: string, handler: () => void) => {
      if (_.includes('change')) {
        handler();
      }
    });
    (watchOnMock as jest.Mock).mockImplementation(onHandler);

    await setupPreloadReload(mockContents);

    expect(watchMock).toHaveBeenCalledWith(
      [
        path.join(app.getAppPath(), 'app/preload.js'),
        path.join(app.getAppPath(), 'app/injected.js'),
      ],
      { awaitWriteFinish: true }
    );
    expect(watchOnMock).toHaveBeenCalledWith('change', expect.any(Function));
    expect(onHandler).toHaveBeenCalled();
    expect(mockContents.reload).toHaveBeenCalledTimes(1);
  });

  it('ignores destroyed webContents on watched preload change', async () => {
    const mockContents = {
      isDestroyed: jest.fn(() => true),
      reload: jest.fn(),
    } as unknown as WebContents;

    const onHandler = jest.fn((_: string, handler: () => void) => {
      if (_.includes('change')) {
        handler();
      }
    });
    (watchOnMock as jest.Mock).mockImplementation(onHandler);

    await setupPreloadReload(mockContents);

    expect(mockContents.reload).not.toHaveBeenCalled();
  });
});
