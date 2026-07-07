import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import type { WebContents } from 'electron';
import { app } from 'electron';

import {
  setUserDataDirectory,
  setupRootWindowReload,
  setupPreloadReload,
} from './dev';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
    getAppPath: jest.fn(),
    setPath: jest.fn(),
    name: 'Rocket.Chat',
    mas: false,
  },
}));

const watchMock = jest.fn();
const watchOnMock = jest.fn();

const mockInstallExtension = jest.fn(async () => undefined);

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: { writeFile: jest.fn() },
  writeFileSync: jest.fn(),
}));

jest.mock('chokidar', () => ({
  watch: (..._args: any[]) => {
    watchMock(..._args);
    return { on: watchOnMock };
  },
}));

jest.mock('electron-devtools-installer', () => ({
  __esModule: true,
  default: mockInstallExtension,
  REACT_DEVELOPER_TOOLS: 'REACT',
  REDUX_DEVTOOLS: 'REDUX',
}));

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

  it('installs extension packs in development tooling setup', async () => {
    process.env.NODE_ENV = 'development';
    const { installDevTools } = await import('./dev');
    await installDevTools();

    expect(mockInstallExtension).toHaveBeenCalledWith('REACT');
    expect(mockInstallExtension).toHaveBeenCalledWith('REDUX');
    expect(mockInstallExtension).toHaveBeenCalledTimes(2);
  });
});
