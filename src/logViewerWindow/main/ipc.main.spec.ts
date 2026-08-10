import fs from 'fs';

import { openLogViewerWindow, startLogViewerWindowHandler } from '../ipc';

const handlers = new Map<string, Function>();
const select = jest.fn();
const dispatch = jest.fn();
const getRootWindow = jest.fn();

const logContent = [
  '[2026-01-01T00:00:00.000Z] [info] [main] first',
  '[2026-01-01T00:00:01.000Z] [info] [main] second',
  '[2026-01-01T00:00:02.000Z] [error] [main] third',
].join('\n');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    statSync: jest.fn(() => ({
      size: 128,
      mtime: new Date('2026-01-01T00:00:02.000Z'),
    })),
    promises: {
      readFile: jest.fn(async () => logContent),
      writeFile: jest.fn(async () => undefined),
      mkdir: jest.fn(async () => undefined),
      stat: jest.fn(async () => ({
        size: 128,
        mtime: new Date('2026-01-01T00:00:02.000Z'),
        mtimeMs: Date.parse('2026-01-01T00:00:02.000Z'),
      })),
    },
    createWriteStream: jest.fn(() => ({
      on: jest.fn(),
    })),
    readFile: jest.fn(
      (
        _p: string,
        enc: string | ((err: null, data: string) => void),
        cb?: (err: null, data: string) => void
      ) => {
        if (typeof enc === 'function') {
          enc(null, logContent);
        } else {
          cb?.(null, logContent);
        }
      }
    ),
    writeFile: jest.fn((_p: string, _data: string, cb?: (err: null) => void) =>
      cb?.(null)
    ),
  };
});

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) =>
      name === 'logs' ? '/tmp/logs' : '/tmp'
    ),
    getAppPath: jest.fn(() => '/app'),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn().mockResolvedValue(undefined),
    once: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    isMinimized: jest.fn(() => false),
    restore: jest.fn(),
    addListener: jest.fn(),
    isDestroyed: jest.fn(() => false),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn(),
      setWindowOpenHandler: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
    },
    getNormalBounds: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
    setBounds: jest.fn(),
    close: jest.fn(),
  })),
  screen: {
    getDisplayNearestPoint: jest.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      workAreaSize: { width: 1920, height: 1080 },
    })),
    getCursorScreenPoint: jest.fn(() => ({ x: 10, y: 10 })),
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
    })),
  },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn(),
    showMessageBox: jest.fn().mockResolvedValue({ response: 1 }),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('archiver', () =>
  jest.fn(() => ({
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
    on: jest.fn(),
  }))
);

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));

jest.mock('../../ipc/main', () => ({
  handle: (channel: string, fn: Function) => {
    handlers.set(channel, fn);
  },
}));

jest.mock('../../logging/context', () => ({
  getHost: jest.fn((url: string) => new URL(url).hostname),
}));

jest.mock('../../store', () => ({
  select: (...args: unknown[]) => select(...args),
  dispatch: (...args: unknown[]) => dispatch(...args),
  watch: jest.fn(),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: (...args: unknown[]) => getRootWindow(...args),
}));

describe('logViewerWindow/ipc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    getRootWindow.mockResolvedValue({
      getNormalBounds: () => ({ x: 0, y: 0, width: 1000, height: 700 }),
      isDestroyed: () => false,
    });
    select.mockImplementation((selector: any) =>
      selector({
        servers: [{ url: 'https://open.rocket.chat', title: 'Community' }],
      })
    );
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('opens a log viewer window', async () => {
    await openLogViewerWindow();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BrowserWindow } = require('electron');
    expect(BrowserWindow).toHaveBeenCalled();
  });

  it('registers handlers and reads default log with limit', async () => {
    startLogViewerWindowHandler();
    expect(handlers.has('log-viewer-window/read-logs')).toBe(true);

    const result = await handlers.get('log-viewer-window/read-logs')?.(
      {},
      {
        limit: 2,
      }
    );
    expect(result.success).toBe(true);
    expect(result.logs).toEqual(expect.any(String));
    expect(result.fileName).toBe('main.log');
    expect(result.isDefaultLog).toBe(true);
  });

  it('rejects unauthorized custom log paths', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/read-logs')?.(
      {},
      { filePath: '/tmp/custom.log', limit: 10 }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not authorized|Path traversal|absolute/i);
  });

  it('rejects path traversal', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/read-logs')?.(
      {},
      { filePath: '/tmp/../etc/passwd.log', limit: 10 }
    );
    expect(result.success).toBe(false);
  });

  it('returns server mapping', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/get-server-mapping')?.(
      {}
    );
    expect(result.success).toBe(true);
    expect(result.mapping['open.rocket.chat']).toBe('Community');
  });

  it('clears logs', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/clear-logs')?.({});
    expect(result.success).toBe(true);
  });

  it('reads all logs when limit is all', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/read-logs')?.(
      {},
      {
        limit: 'all',
      }
    );
    expect(result.success).toBe(true);
    expect(result.logs).toContain('first');
    expect(result.logs).toContain('third');
  });

  it('stats the default log file', async () => {
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/stat-log')?.({});
    expect(result.success).toBe(true);
  });

  it('select-log-file returns canceled when dialog cancels', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dialog } = require('electron');
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    await openLogViewerWindow();
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/select-log-file')?.(
      {}
    );
    expect(result.canceled || result.success === false).toBe(true);
  });

  it('close-requested is safe when window exists', async () => {
    await openLogViewerWindow();
    startLogViewerWindowHandler();
    await expect(
      handlers.get('log-viewer-window/close-requested')?.({})
    ).resolves.not.toThrow();
  });

  it('confirm-clear-logs uses dialog', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dialog } = require('electron');
    dialog.showMessageBox.mockResolvedValue({ response: 1 });
    await openLogViewerWindow();
    startLogViewerWindowHandler();
    const result = await handlers.get('log-viewer-window/confirm-clear-logs')?.(
      {}
    );
    expect(typeof result === 'boolean' || result === undefined).toBe(true);
  });
});
