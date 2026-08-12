/**
 * Regression tests for the fix to `src/documentViewerWindow/ipc.ts`: a reused
 * window used to receive `DOCUMENT_CHANNEL` synchronously, racing the
 * renderer's listener registration whenever the page was still loading and
 * silently dropping the message. This file lives in `main/` (mirroring the
 * `videoCallWindow/main/ipc.main.spec.ts` convention) so it is discovered by
 * jest's main-process project — a flat `documentViewerWindow/ipc.main.spec.ts`
 * matches neither jest project and is silently never run.
 */

// ---------------------------------------------------------------------------
// `handle` / `listen` / `watch` capture from the store & ipc/main modules.
// ---------------------------------------------------------------------------
const handleRegistry = new Map<string, (...args: any[]) => any>();

jest.mock('../../ipc/main', () => ({
  handle: jest.fn((channel: string, cb: (...args: any[]) => any) => {
    handleRegistry.set(channel, cb);
    return () => handleRegistry.delete(channel);
  }),
}));

const listen = jest.fn((..._a: any[]) => undefined);
const select = jest.fn((..._a: any[]) => false);
const watch = jest.fn((..._a: any[]) => undefined);
jest.mock('../../store', () => ({
  listen: (...a: any[]) => listen(...a),
  select: (...a: any[]) => select(...a),
  watch: (...a: any[]) => watch(...a),
}));

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(() =>
    Promise.resolve({
      getNormalBounds: () => ({ x: 0, y: 0, width: 1200, height: 800 }),
    })
  ),
}));

jest.mock('../../ui/main/secondaryWindowControls', () => ({
  watchWindowControls: jest.fn(),
}));

jest.mock('../../ui/main/secondaryWindowFocus', () => ({
  focusSecondaryWindow: jest.fn((browserWindow: any) => {
    if (browserWindow.isMinimized()) {
      browserWindow.restore();
    }
    browserWindow.show();
    browserWindow.focus();
  }),
}));

jest.mock('../../ui/main/secondaryWindowState', () => ({
  getSavedWindowBounds: jest.fn(() => undefined),
  watchWindowBounds: jest.fn(),
}));

jest.mock('../../ui/windowChrome/appearance', () => ({
  NOT_FULL_SCREENABLE: {},
  getTitleBarOptions: jest.fn(() => ({})),
}));

jest.mock('../saveDocument', () => ({
  saveDocument: jest.fn(),
}));

// ---------------------------------------------------------------------------
// electron mock: BrowserWindow records constructions and exposes captured
// event listeners, plus a controllable `loadFile` and `webContents.isLoading`.
// ---------------------------------------------------------------------------
type FakeWC = {
  isLoading: jest.Mock;
  send: jest.Mock;
  on: jest.Mock;
  once: jest.Mock;
  setWindowOpenHandler: jest.Mock;
  listeners: Record<string, Array<(...a: any[]) => void>>;
};

type FakeBW = {
  webContents: FakeWC;
  loadFile: jest.Mock;
  listeners: Record<string, Array<(...a: any[]) => void>>;
  isDestroyed: jest.Mock;
};

const createdWindows: FakeBW[] = [];

const makeFakeWebContents = (): FakeWC => {
  const listeners: Record<string, Array<(...a: any[]) => void>> = {};
  const register = (event: string, fn: (...a: any[]) => void) => {
    (listeners[event] ??= []).push(fn);
  };
  return {
    isLoading: jest.fn(() => false),
    send: jest.fn(),
    on: jest.fn((event: string, fn: any) => register(event, fn)),
    once: jest.fn((event: string, fn: any) => register(event, fn)),
    setWindowOpenHandler: jest.fn(),
    listeners,
  };
};

// Deferred `loadFile` so tests can control exactly when the page "finishes".
let loadFileDeferred: { promise: Promise<void>; resolve: () => void } | null =
  null;
const makeDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

class FakeBrowserWindow {
  webContents = makeFakeWebContents();

  listeners: Record<string, Array<(...a: any[]) => void>> = {};

  private register(event: string, fn: (...a: any[]) => void) {
    (this.listeners[event] ??= []).push(fn);
  }

  on = jest.fn((event: string, fn: any) => this.register(event, fn));

  once = jest.fn((event: string, fn: any) => this.register(event, fn));

  loadFile = jest.fn(() => {
    if (loadFileDeferred) return loadFileDeferred.promise;
    return Promise.resolve();
  });

  setTitle = jest.fn();

  show = jest.fn();

  focus = jest.fn();

  isMinimized = jest.fn(() => false);

  restore = jest.fn();

  isDestroyed = jest.fn(() => false);

  getNormalBounds = jest.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 }));

  constructor() {
    createdWindows.push(this as unknown as FakeBW);
  }
}

jest.mock('electron', () => ({
  app: { getAppPath: jest.fn(() => '/app') },
  BrowserWindow: jest.fn().mockImplementation(() => new FakeBrowserWindow()),
  screen: {
    getDisplayNearestPoint: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
  },
}));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const fire = (
  listeners: Record<string, Array<(...a: any[]) => void>>,
  event: string,
  ...args: any[]
) => {
  (listeners[event] ?? []).forEach((fn) => fn(...args));
};

const baseRequest = {
  server: 'https://server.example',
  documentUrl: 'https://server.example/file.pdf',
  documentFormat: 'pdf',
};

describe('documentViewerWindow/ipc — reused-window send race', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    handleRegistry.clear();
    createdWindows.length = 0;
    loadFileDeferred = null;
  });

  it('awaits loadFile before resolving the open (window not "built" until the page loaded)', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    loadFileDeferred = makeDeferred();
    const openPromise = openDocumentViewerWindow(baseRequest);
    await flushPromises();

    // The open has not resolved yet: loadFile is still pending.
    let resolved = false;
    openPromise.then(() => {
      resolved = true;
    });
    await flushPromises();
    expect(resolved).toBe(false);

    loadFileDeferred.resolve();
    await openPromise;
    expect(resolved).toBe(true);
  });

  it('sends immediately to a reused window that has finished loading', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    await openDocumentViewerWindow(baseRequest);
    const win = createdWindows[0];
    win.webContents.isLoading.mockReturnValue(false);

    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/second.pdf',
    });

    expect(win.webContents.send).toHaveBeenCalledWith(
      'document-viewer-window/document-changed',
      expect.objectContaining({ url: 'https://server.example/second.pdf' })
    );
  });

  it('defers the send until did-finish-load when the reused window is still loading', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    await openDocumentViewerWindow(baseRequest);
    const win = createdWindows[0];
    win.webContents.isLoading.mockReturnValue(true);

    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/second.pdf',
    });

    // Not sent yet: the page is still loading.
    expect(win.webContents.send).not.toHaveBeenCalled();

    fire(win.webContents.listeners, 'did-finish-load');

    expect(win.webContents.send).toHaveBeenCalledWith(
      'document-viewer-window/document-changed',
      expect.objectContaining({ url: 'https://server.example/second.pdf' })
    );
  });

  it('rapid successive opens during a load end up showing only the LAST requested document', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    await openDocumentViewerWindow(baseRequest);
    const win = createdWindows[0];
    win.webContents.isLoading.mockReturnValue(true);

    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/second.pdf',
    });
    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/third.pdf',
    });

    fire(win.webContents.listeners, 'did-finish-load');

    expect(win.webContents.send).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledWith(
      'document-viewer-window/document-changed',
      expect.objectContaining({ url: 'https://server.example/third.pdf' })
    );
  });

  it('restores a minimized reused window before focusing it', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    await openDocumentViewerWindow(baseRequest);
    const win = createdWindows[0] as unknown as {
      webContents: FakeWC;
      isMinimized: jest.Mock;
      restore: jest.Mock;
      show: jest.Mock;
      focus: jest.Mock;
    };
    win.webContents.isLoading.mockReturnValue(false);
    win.isMinimized.mockReturnValue(true);

    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/second.pdf',
    });

    expect(win.restore).toHaveBeenCalled();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
  });

  it('does not send once the reused window has been destroyed before did-finish-load fires', async () => {
    const { openDocumentViewerWindow } = await import('../ipc');

    await openDocumentViewerWindow(baseRequest);
    const win = createdWindows[0];
    win.webContents.isLoading.mockReturnValue(true);

    await openDocumentViewerWindow({
      ...baseRequest,
      documentUrl: 'https://server.example/second.pdf',
    });

    win.isDestroyed.mockReturnValue(true);
    fire(win.webContents.listeners, 'did-finish-load');

    expect(win.webContents.send).not.toHaveBeenCalled();
  });
});
