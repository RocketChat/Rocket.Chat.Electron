import { EventEmitter } from 'events';

import type { BrowserWindowConstructorOptions } from 'electron';

const state = { isTransparentWindowEnabled: false };
let changed: (enabled: boolean, previous?: boolean) => void;
const dispatchMock = jest.fn();
const quitHandlers: (() => void)[] = [];
const windows: TestWindow[] = [];

class TestWindow extends EventEmitter {
  destroyed = false;

  minimized = false;

  bounds = { x: 50, y: 60, width: 900, height: 650 };

  webContents = Object.assign(new EventEmitter(), {
    send: jest.fn(),
    setWindowOpenHandler: jest.fn(),
    isLoading: jest.fn(() => false),
  });

  loadFile = jest.fn(
    async (_path: string, _options?: { query: Record<string, string> }) =>
      undefined
  );

  show = jest.fn();

  showInactive = jest.fn();

  setTitle = jest.fn();

  isDestroyed = () => this.destroyed;

  isMinimized = () => this.minimized;

  getNormalBounds = () => this.bounds;

  setBounds = jest.fn((bounds: typeof this.bounds) => {
    this.bounds = bounds;
  });

  minimize = jest.fn();

  close = jest.fn(() => {
    this.destroyed = true;
    this.emit('closed');
  });

  constructor(readonly options: BrowserWindowConstructorOptions) {
    super();
    windows.push(this);
  }
}

jest.mock('electron', () => ({
  nativeTheme: { shouldUseDarkColors: true },
  app: {
    getAppPath: () => '/app',
    on: (event: string, handler: () => void) => {
      if (event === 'before-quit') quitHandlers.push(handler);
    },
  },
  BrowserWindow: jest.fn(
    (options: BrowserWindowConstructorOptions) => new TestWindow(options)
  ),
  screen: {
    getDisplayNearestPoint: () => ({
      workAreaSize: { width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
}));
jest.mock('../../store', () => ({
  dispatch: (action: unknown) => dispatchMock(action),
  listen: jest.fn(),
  select: (selector: (value: typeof state) => unknown) => selector(state),
  watch: (
    selector: (value: typeof state) => boolean,
    callback: typeof changed
  ) => {
    changed = callback;
    callback(selector(state), undefined);
  },
}));
jest.mock('../../ipc/main', () => ({ handle: jest.fn() }));
jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));
jest.mock('./rootWindow', () => ({
  getRootWindow: async () => ({
    getNormalBounds: () => ({ x: 0, y: 0, width: 1000, height: 700 }),
  }),
}));
jest.mock('./secondaryWindowState', () => ({
  getSavedWindowBounds: () => undefined,
  watchWindowBounds: jest.fn(),
  onWindowBoundsReset: jest.fn(),
}));
jest.mock('./secondaryWindowControls', () => ({
  watchWindowControls: jest.fn(),
}));
jest.mock('../../documentViewerWindow/saveDocument', () => ({
  saveDocument: jest.fn(),
}));

const originalPlatform = process.platform;
const request = {
  server: 'https://example.test',
  documentUrl: 'https://example.test/report.pdf',
  documentFormat: 'pdf',
};
const cases = [
  ['settingsWindow', 'Settings'],
  ['downloadsWindow', 'Downloads'],
  ['logViewerWindow', 'LogViewer'],
  ['documentViewerWindow', 'DocumentViewer'],
];
const settle = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const openWindow = async (directory: string, name: string): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-dynamic-require
  const ipc = require(`../../${directory}/ipc`);
  ipc[`start${name}WindowHandler`]();
  await ipc[`open${name}Window`](request);
};

describe.each(cases)('%s native appearance', (directory, name) => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    windows.length = 0;
    quitHandlers.length = 0;
    state.isTransparentWindowEnabled = false;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
  });
  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it.each([false, true])(
    'honors transparency=%s at creation',
    async (enabled) => {
      state.isTransparentWindowEnabled = enabled;
      await openWindow(directory, name);
      expect(windows).toHaveLength(1);
      const { options } = windows[0];
      expect(options.backgroundColor).toBe(enabled ? '#00000000' : '#2f343d');
      expect(options.transparent).toBe(enabled ? true : undefined);
      expect(options.vibrancy).toBe(enabled ? 'sidebar' : undefined);
      expect(windows[0].loadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({ transparent: String(enabled) }),
        })
      );
    }
  );

  it('recreates an open window and restores appearance on Cancel', async () => {
    await openWindow(directory, name);
    const { bounds } = windows[0];
    const query = windows[0].loadFile.mock.calls[0];
    state.isTransparentWindowEnabled = true;
    changed(true, false);
    await settle();
    expect(windows).toHaveLength(2);
    expect(windows[0].close).toHaveBeenCalledTimes(1);
    expect(windows[1].options.vibrancy).toBe('sidebar');
    expect(windows[1].setBounds).toHaveBeenCalledWith(bounds);
    windows[1].emit('ready-to-show');
    expect(windows[1].showInactive).toHaveBeenCalledTimes(1);
    expect(windows[1].show).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ payload: false })
    );
    if (directory === 'documentViewerWindow') {
      expect(windows[1].loadFile).toHaveBeenCalledWith(
        query[0],
        expect.objectContaining({
          query: expect.objectContaining({
            url: request.documentUrl,
            server: request.server,
            format: request.documentFormat,
          }),
        })
      );
    }

    state.isTransparentWindowEnabled = false;
    changed(false, true);
    await settle();
    expect(windows).toHaveLength(3);
    expect(windows[2].options.vibrancy).toBeUndefined();
    expect(windows[2].options.backgroundColor).toBe('#2f343d');
    windows[2].close();
    if (directory !== 'documentViewerWindow') {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ payload: false })
      );
    }
  });

  it('coalesces rapid changes and does not recreate during quit', async () => {
    await openWindow(directory, name);
    changed(true, false);
    changed(false, true);
    await settle();
    expect(windows).toHaveLength(2);
    expect(windows[1].options.vibrancy).toBeUndefined();
    quitHandlers.forEach((handler) => handler());
    state.isTransparentWindowEnabled = true;
    changed(true, false);
    await settle();
    expect(windows).toHaveLength(2);
  });

  it('does not reopen a window that the user already closed', async () => {
    await openWindow(directory, name);
    windows[0].close();
    state.isTransparentWindowEnabled = true;
    changed(true, false);
    await settle();
    expect(windows).toHaveLength(1);
  });

  if (directory === 'documentViewerWindow') {
    it('waits for a loading document window before recreating it', async () => {
      let finishLoading!: () => void;
      const page = new Promise<undefined>((resolve) => {
        finishLoading = () => resolve(undefined);
      });
      const { BrowserWindow } = jest.requireMock('electron') as {
        BrowserWindow: jest.Mock;
      };
      BrowserWindow.mockImplementationOnce(
        (options: BrowserWindowConstructorOptions) => {
          const window = new TestWindow(options);
          window.loadFile.mockImplementationOnce(() => page);
          return window;
        }
      );
      const opening = openWindow(directory, name);
      await settle();
      state.isTransparentWindowEnabled = true;
      changed(true, false);
      await settle();
      expect(windows[0].close).not.toHaveBeenCalled();
      finishLoading();
      await opening;
      await settle();
      expect(windows).toHaveLength(2);
      expect(windows[1].options.vibrancy).toBe('sidebar');
      expect(windows[1].loadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({ url: request.documentUrl }),
        })
      );
    });
  }

  it('restores a minimized window without showing it as active', async () => {
    await openWindow(directory, name);
    windows[0].minimized = true;
    state.isTransparentWindowEnabled = true;
    changed(true, false);
    await settle();
    windows[1].emit('ready-to-show');
    expect(windows[1].minimize).toHaveBeenCalledTimes(1);
    expect(windows[1].show).not.toHaveBeenCalled();
  });

  it('does not reopen when quitting begins while the old window closes', async () => {
    await openWindow(directory, name);
    windows[0].once('closed', () => {
      quitHandlers.forEach((handler) => handler());
    });
    state.isTransparentWindowEnabled = true;
    changed(true, false);
    await settle();
    expect(windows).toHaveLength(1);
  });

  it('handles a recreation failure without an unhandled rejection', async () => {
    await openWindow(directory, name);
    const { BrowserWindow } = jest.requireMock('electron') as {
      BrowserWindow: jest.Mock;
    };
    const failure = new Error('window unavailable');
    const reportError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      BrowserWindow.mockImplementationOnce(() => {
        throw failure;
      });
      state.isTransparentWindowEnabled = true;
      changed(true, false);
      await settle();
      expect(reportError).toHaveBeenCalledWith(
        'Could not recreate secondary window appearance:',
        failure
      );
    } finally {
      reportError.mockRestore();
    }
  });

  it.each(['linux', 'win32'])(
    'preserves opaque secondary windows on %s',
    async (platform) => {
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true,
      });
      state.isTransparentWindowEnabled = true;
      await openWindow(directory, name);
      expect(windows[0].options.transparent).toBeUndefined();
      expect(windows[0].options.vibrancy).toBeUndefined();
    }
  );
});
