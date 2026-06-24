/**
 * Regression tests for the PR #3359 hardening of `src/videoCallWindow/ipc.ts`.
 *
 * Location note: the brief asked for `src/videoCallWindow/ipc.main.spec.ts`, but
 * jest.config.js routes MAIN-process tests via
 *   '<rootDir>/src/*\/main/**\/*.(spec|test)...'  and
 *   '<rootDir>/src/**\/main.(spec|test)...'
 * The second pattern requires the literal filename `main.spec.ts`; a flat
 * `videoCallWindow/ipc.main.spec.ts` matches NEITHER project and is silently
 * never run (verified with `jest --listTests`). The established convention for
 * this module is the sibling `src/videoCallWindow/main/ipc.spec.ts`, which
 * matches `src/*\/main/**`. This file lives in that same `main/` dir so it is
 * actually discovered and run by the main-process project.
 *
 * Strategy A (chosen): exercise the real module wiring. We mock `'../../ipc/main'`
 * so every `handle(channel, cb)` registration captures `cb` into a map; the
 * open-window behavior is then driven by invoking the captured
 * `'video-call-window/open-window'` callback directly. All sibling imports of
 * `ipc.ts` (electron, serverView, serverViewScreenSharing, rootWindow, store,
 * etc.) are mocked. This validates the genuine flow:
 *   open-window callback -> openWindowQueue chain -> openVideoCallWindow ->
 *   activeCall assignment -> BrowserWindow creation -> 'closed'/'render-process-gone'
 *   listeners -> restoreServerViewHandler.
 *
 * `restoreServerViewHandler`, `activeCall` and `openVideoCallWindow` are
 * module-internal and NOT exported. We observe them indirectly:
 *  - `activeCall.partition` / `isSharedSession` -> via the `loadFile` query
 *    `partition` arg AND via whether `restoreServerViewHandler` (fired through
 *    the BrowserWindow `'closed'` listener) calls `setupServerViewDisplayMedia`.
 *  - `restoreServerViewHandler` -> by capturing the BrowserWindow `'closed'`
 *    listener and the webContents `'render-process-gone'` listener and firing
 *    them, then asserting `setupServerViewDisplayMedia` calls.
 *  - serialization -> by gating the awaited `getRootWindow()` on a controllable
 *    deferred and asserting the 2nd BrowserWindow is not constructed until the
 *    1st open body resolves.
 *  - null-out guard -> by driving two opens then firing the FIRST window's
 *    delayed `'closed'` teardown and asserting the fresh `activeCall` survives
 *    (observed via a subsequent restore still targeting the 2nd server).
 *
 * No production code was changed; Strategy B (test-only export) was not needed.
 */
import type { WebContents } from 'electron';

// ---------------------------------------------------------------------------
// `handle` capture: the SUT calls handle() both at module top-level and inside
// startVideoCallWindowHandler(). We record every registration into a map keyed
// by channel so tests can invoke the open-window callback directly.
// ---------------------------------------------------------------------------
const handleRegistry = new Map<string, (...args: any[]) => any>();

jest.mock('../../ipc/main', () => ({
  handle: jest.fn((channel: string, cb: (...args: any[]) => any) => {
    handleRegistry.set(channel, cb);
    return () => handleRegistry.delete(channel);
  }),
}));

// --- serverView: controls server-URL resolution and live server webContents ---
const getServerUrlByWebContentsId = jest.fn();
const getWebContentsByServerUrl = jest.fn();
const setupServerViewPermissionHandler = jest.fn((..._a: any[]) => undefined);
jest.mock('../../ui/main/serverView', () => ({
  getServerUrlByWebContentsId: (...a: any[]) =>
    getServerUrlByWebContentsId(...a),
  getWebContentsByServerUrl: (...a: any[]) => getWebContentsByServerUrl(...a),
  setupServerViewPermissionHandler: (...a: any[]) =>
    setupServerViewPermissionHandler(...a),
}));

// --- the handler restore + routing surface under test ---
const setupServerViewDisplayMedia = jest.fn((..._a: any[]) => undefined);
const handleServerViewDisplayMediaRequest = jest.fn(
  (..._a: any[]) => undefined
);
jest.mock('../../screenSharing/serverViewScreenSharing', () => ({
  setupServerViewDisplayMedia: (...a: any[]) =>
    setupServerViewDisplayMedia(...a),
  handleServerViewDisplayMediaRequest: (...a: any[]) =>
    handleServerViewDisplayMediaRequest(...a),
}));

// --- getRootWindow is the first awaited point inside openVideoCallWindow ---
// A controllable deferred lets us assert serialization ordering deterministically.
let rootWindowDeferred: {
  promise: Promise<any>;
  resolve: (v: any) => void;
} | null = null;
const makeDeferred = () => {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const fakeRootWindow = {
  getNormalBounds: jest.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 })),
  isDestroyed: jest.fn(() => false),
  isMinimized: jest.fn(() => false),
  restore: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
};
const getRootWindow = jest.fn((..._a: any[]) => {
  // Default: resolve immediately. Tests can swap in a deferred to gate it.
  if (rootWindowDeferred) return rootWindowDeferred.promise;
  return Promise.resolve(fakeRootWindow);
});
const isInsideSomeScreen = jest.fn((..._a: any[]) => true);
jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: (...a: any[]) => getRootWindow(...a),
  isInsideSomeScreen: (...a: any[]) => isInsideSomeScreen(...a),
}));

// --- store: select() returns a state shape sufficient for the open path ---
const select = jest.fn((..._a: any[]) => ({
  videoCallWindowState: { bounds: { x: 0, y: 0, width: 0, height: 0 } },
  isVideoCallWindowPersistenceEnabled: false,
  isAutoOpenEnabled: false,
}));
const dispatchLocal = jest.fn((..._a: any[]) => undefined);
jest.mock('../../store', () => ({
  select: (...a: any[]) => select(...a),
  dispatchLocal: (...a: any[]) => dispatchLocal(...a),
}));

// --- remaining leaf imports of ipc.ts: keep them inert ---
jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));
jest.mock('../../i18n/common', () => ({ fallbackLng: 'en' }));
jest.mock('../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../screenSharing/desktopCapturerCache', () => ({
  clearDesktopCapturerCache: jest.fn(),
  getDesktopCapturerCacheStatus: jest.fn(() => ({
    cached: false,
    pending: false,
  })),
  prewarmDesktopCapturerCache: jest.fn(),
}));
jest.mock('../../screenSharing/screenRecordingPermission', () => ({
  checkScreenRecordingPermission: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../ui/main/debounce', () => ({
  debounce: (cb: any) => cb,
}));
jest.mock('../../ui/main/mediaPermissions', () => ({
  handleMediaPermissionRequest: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));
// The screen picker module is dynamically imported by setupWebviewHandlers; a
// lightweight stub keeps that async branch from throwing.
jest.mock('../../screenSharing/screenPicker', () => ({
  createScreenPicker: jest.fn(() => ({
    handleDisplayMediaRequest: jest.fn(),
  })),
  InternalPickerProvider: class {},
}));
// ScreenSharingRequestTracker only needs to be constructible + .cleanup().
jest.mock('../../screenSharing/ScreenSharingRequestTracker', () => ({
  ScreenSharingRequestTracker: class {
    cleanup = jest.fn();

    createRequest = jest.fn();
  },
}));

// ---------------------------------------------------------------------------
// electron mock. BrowserWindow records constructions and exposes captured
// event listeners so tests can fire 'closed' / 'render-process-gone'.
// ---------------------------------------------------------------------------
type FakeWC = {
  id: number;
  isDestroyed: jest.Mock;
  on: jest.Mock;
  once: jest.Mock;
  setWindowOpenHandler: jest.Mock;
  removeAllListeners: jest.Mock;
  session: { setPermissionRequestHandler: jest.Mock };
  executeJavaScript: jest.Mock;
  listeners: Record<string, Array<(...a: any[]) => void>>;
};

type FakeBW = {
  webContents: FakeWC;
  loadFile: jest.Mock;
  listeners: Record<string, Array<(...a: any[]) => void>>;
  loadFileQuery: any;
};

const createdWindows: FakeBW[] = [];
let wcIdSeq = 1000;

const makeFakeWebContents = (): FakeWC => {
  const listeners: Record<string, Array<(...a: any[]) => void>> = {};
  const register = (event: string, fn: (...a: any[]) => void) => {
    (listeners[event] ??= []).push(fn);
  };
  return {
    id: wcIdSeq++,
    isDestroyed: jest.fn(() => false),
    on: jest.fn((event: string, fn: any) => register(event, fn)),
    once: jest.fn((event: string, fn: any) => register(event, fn)),
    setWindowOpenHandler: jest.fn(),
    removeAllListeners: jest.fn(),
    session: { setPermissionRequestHandler: jest.fn() },
    executeJavaScript: jest.fn(() => Promise.resolve()),
    listeners,
  };
};

class FakeBrowserWindow {
  webContents = makeFakeWebContents();

  loadFile = jest.fn((_path: string, opts?: any) => {
    (this as unknown as FakeBW).loadFileQuery = opts?.query;
    return Promise.resolve();
  });

  listeners: Record<string, Array<(...a: any[]) => void>> = {};

  loadFileQuery: any = undefined;

  private register(event: string, fn: (...a: any[]) => void) {
    (this.listeners[event] ??= []).push(fn);
  }

  on = jest.fn((event: string, fn: any) => this.register(event, fn));

  once = jest.fn((event: string, fn: any) => this.register(event, fn));

  addListener = jest.fn((event: string, fn: any) => this.register(event, fn));

  removeAllListeners = jest.fn();

  close = jest.fn();

  isDestroyed = jest.fn(() => false);

  setTitle = jest.fn();

  show = jest.fn();

  focus = jest.fn();

  isMinimized = jest.fn(() => false);

  restore = jest.fn();

  isFocused = jest.fn(() => true);

  isVisible = jest.fn(() => true);

  getNormalBounds = jest.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 }));

  constructor() {
    createdWindows.push(this as unknown as FakeBW);
  }
}

const screen = {
  getDisplayNearestPoint: jest.fn(() => ({
    workAreaSize: { width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  })),
};

jest.mock('electron', () => ({
  app: { getAppPath: jest.fn(() => '/app') },
  BrowserWindow: Object.assign(
    jest.fn().mockImplementation(() => new FakeBrowserWindow()),
    { fromWebContents: jest.fn(() => null) }
  ),
  ipcMain: {
    on: jest.fn(),
    once: jest.fn(),
    handle: jest.fn(),
    removeHandler: jest.fn(),
    removeListener: jest.fn(),
  },
  screen,
  webContents: {
    getAllWebContents: jest.fn(() => []),
    fromFrame: jest.fn(() => null),
  },
}));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const makeCallerWc = (id: number): WebContents =>
  ({
    id,
    getURL: jest.fn(() => 'https://server.example/'),
    isDestroyed: jest.fn(() => false),
  }) as unknown as WebContents;

// Load the SUT fresh (resets module-internal `activeCall`, `openWindowQueue`,
// `videoCallWindow`) and register all handlers.
const loadModule = async () => {
  const mod = await import('../ipc');
  mod.startVideoCallWindowHandler();
  const openWindow = handleRegistry.get('video-call-window/open-window');
  if (!openWindow) throw new Error('open-window handler not registered');
  return { mod, openWindow };
};

// Drive a single open and wait for the queued chain + async body to settle.
const open = async (
  openWindow: (...a: any[]) => any,
  callerWc: WebContents,
  url = 'https://meet.example/room'
) => {
  const p = openWindow(callerWc, url, undefined);
  await flushPromises();
  await flushPromises();
  await p;
  await flushPromises();
};

// Fire a captured event listener set (window or webContents).
const fire = (
  listeners: Record<string, Array<(...a: any[]) => void>>,
  event: string,
  ...args: any[]
) => {
  (listeners[event] ?? []).forEach((fn) => fn(...args));
};

describe('videoCallWindow/ipc — PR #3359 hardening', () => {
  let realSetTimeout: typeof setTimeout;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    handleRegistry.clear();
    createdWindows.length = 0;
    rootWindowDeferred = null;
    wcIdSeq = 1000;
    realSetTimeout = global.setTimeout;
    // Re-apply default impls after clearAllMocks wiped them.
    select.mockImplementation(() => ({
      videoCallWindowState: { bounds: { x: 0, y: 0, width: 0, height: 0 } },
      isVideoCallWindowPersistenceEnabled: false,
      isAutoOpenEnabled: false,
    }));
    getRootWindow.mockImplementation(() =>
      rootWindowDeferred
        ? rootWindowDeferred.promise
        : Promise.resolve(fakeRootWindow)
    );
    // clearAllMocks() keeps mockReturnValue impls, so reset the root-window
    // window-state methods to deterministic defaults for each test.
    fakeRootWindow.isDestroyed.mockReturnValue(false);
    fakeRootWindow.isMinimized.mockReturnValue(false);
  });

  // -------------------------------------------------------------------------
  // open — shared vs fallback partition  (behavior #1)
  // -------------------------------------------------------------------------
  it('open (shared): resolvable server -> partition persist:<url>, isSharedSession true', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
    const { openWindow } = await loadModule();

    await open(openWindow, makeCallerWc(42));

    expect(createdWindows).toHaveLength(1);
    // partition propagated to the loadFile handshake query
    expect(createdWindows[0].loadFileQuery.partition).toBe(
      'persist:https://chat.example'
    );

    // isSharedSession=true is proven by restore firing setupServerViewDisplayMedia:
    const serverWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverWc);
    fire(createdWindows[0].listeners, 'closed');
    expect(setupServerViewDisplayMedia).toHaveBeenCalledTimes(1);
    expect(setupServerViewDisplayMedia).toHaveBeenCalledWith(serverWc);
    // restore resolved the server URL stripped of the persist: prefix
    expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
      'https://chat.example'
    );

    // restore also re-installs the permission handler (after awaiting the
    // root window) so the live main webview's prompts come back.
    await flushPromises();
    expect(setupServerViewPermissionHandler).toHaveBeenCalledTimes(1);
    expect(setupServerViewPermissionHandler).toHaveBeenCalledWith(
      serverWc,
      fakeRootWindow
    );
  });

  it('open (fallback): unresolvable server -> partition persist:jitsi-session, isSharedSession false', async () => {
    getServerUrlByWebContentsId.mockReturnValue(undefined);
    const { openWindow } = await loadModule();

    await open(openWindow, makeCallerWc(7));

    expect(createdWindows).toHaveLength(1);
    expect(createdWindows[0].loadFileQuery.partition).toBe(
      'persist:jitsi-session'
    );

    // isSharedSession=false -> restore is a no-op
    fire(createdWindows[0].listeners, 'closed');
    await flushPromises();
    expect(setupServerViewDisplayMedia).not.toHaveBeenCalled();
    expect(setupServerViewPermissionHandler).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // restore — shared / fallback / destroyed / idempotent  (behavior #3)
  // Driven through the BrowserWindow 'closed' listener (the real call site of
  // restoreServerViewHandler with the captured call).
  // -------------------------------------------------------------------------
  it('restore (shared): live, non-destroyed server webContents -> setupServerViewDisplayMedia called once', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://a.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    const serverWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverWc);

    fire(createdWindows[0].listeners, 'closed');

    expect(setupServerViewDisplayMedia).toHaveBeenCalledTimes(1);
    expect(setupServerViewDisplayMedia).toHaveBeenCalledWith(serverWc);
  });

  it('restore (fallback): isSharedSession=false -> setupServerViewDisplayMedia NOT called', async () => {
    getServerUrlByWebContentsId.mockReturnValue(undefined);
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    getWebContentsByServerUrl.mockReturnValue({
      isDestroyed: jest.fn(() => false),
    });
    fire(createdWindows[0].listeners, 'closed');

    expect(getWebContentsByServerUrl).not.toHaveBeenCalled();
    expect(setupServerViewDisplayMedia).not.toHaveBeenCalled();
  });

  it('restore (unresolved server): getWebContentsByServerUrl returns undefined -> NOT called', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://gone.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    getWebContentsByServerUrl.mockReturnValue(undefined);
    fire(createdWindows[0].listeners, 'closed');

    expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
      'https://gone.example'
    );
    expect(setupServerViewDisplayMedia).not.toHaveBeenCalled();
  });

  it('restore (destroyed server): isDestroyed()===true -> NOT called', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://dead.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    getWebContentsByServerUrl.mockReturnValue({
      isDestroyed: jest.fn(() => true),
    });
    fire(createdWindows[0].listeners, 'closed');

    expect(setupServerViewDisplayMedia).not.toHaveBeenCalled();
  });

  it('restore (idempotent): firing restore via closed + render-process-gone 3x -> called 3x, no throw', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://idem.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    const serverWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverWc);

    // three independent restore invocations across the real call sites:
    expect(() => {
      fire(createdWindows[0].listeners, 'closed'); // window 'closed'
      fire(createdWindows[0].webContents.listeners, 'render-process-gone'); // crash path
      fire(createdWindows[0].listeners, 'closed'); // again
    }).not.toThrow();

    expect(setupServerViewDisplayMedia).toHaveBeenCalledTimes(3);
    expect(setupServerViewDisplayMedia).toHaveBeenCalledWith(serverWc);

    // The permission-handler restore is awaited; flush, then it must mirror the
    // display-media restore (once per invocation).
    await flushPromises();
    expect(setupServerViewPermissionHandler).toHaveBeenCalledTimes(3);
    expect(setupServerViewPermissionHandler).toHaveBeenCalledWith(
      serverWc,
      fakeRootWindow
    );
  });

  // -------------------------------------------------------------------------
  // render-process-gone restore path  (behavior #3, crash entry)
  // -------------------------------------------------------------------------
  it('restore via render-process-gone: shared session restores handler', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://crash.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    const serverWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverWc);

    fire(createdWindows[0].webContents.listeners, 'render-process-gone');

    expect(setupServerViewDisplayMedia).toHaveBeenCalledTimes(1);
    expect(setupServerViewDisplayMedia).toHaveBeenCalledWith(serverWc);
  });

  // -------------------------------------------------------------------------
  // null-out guard  (behavior #5)
  // A stale prior-window 'closed' teardown firing AFTER a fresh open must not
  // wipe the freshly-set activeCall. We prove the fresh activeCall survives by
  // showing a restore for the SECOND server still works after the first
  // window's delayed teardown ran.
  // -------------------------------------------------------------------------
  it('null-out guard: stale first-window teardown does not wipe fresh activeCall', async () => {
    // First open -> server A
    getServerUrlByWebContentsId.mockReturnValue('https://first.example');
    const { openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1), 'https://meet.example/a');
    const firstWindow = createdWindows[0];

    // Second open -> server B (fresh activeCall = B). A DIFFERENT conference URL
    // so the same-conference focus short-circuit is not taken; the existing-
    // window guard in openVideoCallWindow closes the first window synchronously.
    getServerUrlByWebContentsId.mockReturnValue('https://second.example');
    await open(openWindow, makeCallerWc(2), 'https://meet.example/b');
    expect(createdWindows).toHaveLength(2);
    const secondWindow = createdWindows[1];

    // Now fire the FIRST window's 'closed' teardown. Its captured call (A) !==
    // current activeCall (B), so the `if (activeCall === capturedCall)` guard
    // must NOT null activeCall. We let its 50ms setTimeout run.
    fire(firstWindow.listeners, 'closed');
    await new Promise((r) => realSetTimeout(r, 80));

    // activeCall must still be B: firing the SECOND window's restore resolves
    // server B (not A, not undefined).
    const serverBWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverBWc);
    fire(secondWindow.listeners, 'closed');

    expect(getWebContentsByServerUrl).toHaveBeenLastCalledWith(
      'https://second.example'
    );
    expect(setupServerViewDisplayMedia).toHaveBeenLastCalledWith(serverBWc);
  });

  // -------------------------------------------------------------------------
  // serialization / race  (behavior #6)
  // openWindowQueue chains opens; getRootWindow() is the first awaited point in
  // the body. Gating it on a deferred proves the 2nd open's BrowserWindow is
  // NOT constructed until the 1st open's body completes.
  // -------------------------------------------------------------------------
  it('serialization: two unawaited opens construct BrowserWindows serially, last open wins', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://serial.example');
    const { openWindow } = await loadModule();

    // Gate the FIRST open at getRootWindow.
    const d1 = makeDeferred();
    rootWindowDeferred = d1;

    const p1 = openWindow(makeCallerWc(1), 'https://meet.example/a', undefined);
    const p2 = openWindow(makeCallerWc(2), 'https://meet.example/b', undefined);
    await flushPromises();
    await flushPromises();

    // First open is blocked at getRootWindow; second open must not have run its
    // body yet because the queue serializes on p1. No window constructed.
    expect(createdWindows).toHaveLength(0);

    // Release the first open. From here the queue lets the second proceed; swap
    // back to immediate resolution so the second open's getRootWindow resolves.
    rootWindowDeferred = null;
    d1.resolve(fakeRootWindow);
    await flushPromises();
    await flushPromises();
    await p1;
    await flushPromises();
    await flushPromises();
    await p2;
    await flushPromises();

    // Both completed; exactly two windows created (one per open), in order.
    expect(createdWindows).toHaveLength(2);
    // The LAST open wins: loadFile carried the second URL.
    expect(createdWindows[1].loadFileQuery.url).toBe('https://meet.example/b');
  });

  // -------------------------------------------------------------------------
  // cleanup restore path  (behavior #2 gate + behavior #3 restore)
  // cleanupVideoCallResources() -> cleanupVideoCallWindow() -> restore.
  // -------------------------------------------------------------------------
  it('cleanupVideoCallResources triggers restore for shared session', async () => {
    getServerUrlByWebContentsId.mockReturnValue('https://cleanup.example');
    const { mod, openWindow } = await loadModule();
    await open(openWindow, makeCallerWc(1));

    const serverWc = { isDestroyed: jest.fn(() => false) };
    getWebContentsByServerUrl.mockReturnValue(serverWc);

    mod.cleanupVideoCallResources();
    await flushPromises();

    expect(setupServerViewDisplayMedia).toHaveBeenCalledWith(serverWc);
  });

  // -------------------------------------------------------------------------
  // open-in-main-window: focus the main window + emit 'navigate-to-route'
  // -------------------------------------------------------------------------
  describe('open-in-main-window', () => {
    const loadHandler = async () => {
      await loadModule();
      const handler = handleRegistry.get(
        'video-call-window/open-in-main-window'
      );
      if (!handler)
        throw new Error('open-in-main-window handler not registered');
      return handler;
    };

    const makeServerWc = () => ({
      isDestroyed: jest.fn(() => false),
      send: jest.fn(),
    });

    it("caller's server resolves -> focuses main window and emits navigate-to-route", async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      const serverWc = makeServerWc();
      getWebContentsByServerUrl.mockReturnValue(serverWc);

      const handler = await loadHandler();
      await handler(makeCallerWc(42), '/channel/general');

      expect(getServerUrlByWebContentsId).toHaveBeenCalledWith(42);
      expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
        'https://chat.example'
      );
      expect(fakeRootWindow.show).toHaveBeenCalledTimes(1);
      expect(fakeRootWindow.focus).toHaveBeenCalledTimes(1);
      expect(serverWc.send).toHaveBeenCalledWith(
        'navigate-to-route',
        '/channel/general'
      );
    });

    it('falls back to the active server when the caller is unresolved', async () => {
      getServerUrlByWebContentsId.mockReturnValue(undefined);
      select.mockImplementation((sel: any) =>
        sel({ currentView: { url: 'https://active.example' } })
      );
      const serverWc = makeServerWc();
      getWebContentsByServerUrl.mockReturnValue(serverWc);

      const handler = await loadHandler();
      await handler(makeCallerWc(99), '/admin/rooms');

      expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
        'https://active.example'
      );
      expect(serverWc.send).toHaveBeenCalledWith(
        'navigate-to-route',
        '/admin/rooms'
      );
    });

    it("prefers the active call's origin server over the active view when the caller is unresolved", async () => {
      // Open a call from server A so `activeCall.serverWebContentsId` is set.
      getServerUrlByWebContentsId.mockReturnValue('https://origin.example');
      const { openWindow } = await loadModule();
      await open(openWindow, makeCallerWc(50));

      // The open-in-main-window caller (the standalone video window) does not
      // resolve to a server; the active view is a *different* server. The
      // handler must target the call's origin server, not the active view.
      const handler = handleRegistry.get(
        'video-call-window/open-in-main-window'
      );
      if (!handler)
        throw new Error('open-in-main-window handler not registered');

      getServerUrlByWebContentsId.mockImplementation((id: number) =>
        id === 50 ? 'https://origin.example' : undefined
      );
      select.mockImplementation((sel: any) =>
        sel({ currentView: { url: 'https://other.example' } })
      );
      const serverWc = makeServerWc();
      getWebContentsByServerUrl.mockReturnValue(serverWc);

      await handler(makeCallerWc(999), '/channel/general');

      expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
        'https://origin.example'
      );
      expect(getWebContentsByServerUrl).not.toHaveBeenCalledWith(
        'https://other.example'
      );
      expect(serverWc.send).toHaveBeenCalledWith(
        'navigate-to-route',
        '/channel/general'
      );
    });

    it('restores the main window when minimized', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      getWebContentsByServerUrl.mockReturnValue(makeServerWc());
      fakeRootWindow.isMinimized.mockReturnValue(true);

      const handler = await loadHandler();
      await handler(makeCallerWc(1), '/channel/general');

      expect(fakeRootWindow.restore).toHaveBeenCalledTimes(1);
    });

    it.each([
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
      'channel/general',
    ])(
      'rejects non-relative path %p -> no focus, no navigate',
      async (badPath) => {
        getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
        const serverWc = makeServerWc();
        getWebContentsByServerUrl.mockReturnValue(serverWc);

        const handler = await loadHandler();
        await handler(makeCallerWc(1), badPath);

        expect(serverWc.send).not.toHaveBeenCalled();
        expect(fakeRootWindow.focus).not.toHaveBeenCalled();
      }
    );

    it('no-ops safely when the target server webview is missing', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      getWebContentsByServerUrl.mockReturnValue(undefined);

      const handler = await loadHandler();
      await expect(
        handler(makeCallerWc(1), '/channel/general')
      ).resolves.toBeUndefined();

      expect(fakeRootWindow.focus).not.toHaveBeenCalled();
    });

    it('no-ops safely when the target server webview is destroyed', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      getWebContentsByServerUrl.mockReturnValue({
        isDestroyed: jest.fn(() => true),
        send: jest.fn(),
      });

      const handler = await loadHandler();
      await handler(makeCallerWc(1), '/channel/general');

      expect(fakeRootWindow.focus).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // close: 'video-call-window/close' (ipcMain.on) closes the sender's window
  // -------------------------------------------------------------------------
  describe('close', () => {
    const getCloseHandler = async () => {
      await loadModule();
      const electron = (await import('electron')) as any;
      const call = electron.ipcMain.on.mock.calls.find(
        ([channel]: [string]) => channel === 'video-call-window/close'
      );
      if (!call) throw new Error('close listener not registered');
      const fromWebContents = electron.BrowserWindow
        .fromWebContents as jest.Mock;
      fromWebContents.mockReset();
      return {
        listener: call[1] as (event: { sender: any }) => void,
        fromWebContents,
      };
    };

    it('closes the window resolved from the sender', async () => {
      const { listener, fromWebContents } = await getCloseHandler();
      const win = { isDestroyed: jest.fn(() => false), close: jest.fn() };
      fromWebContents.mockReturnValue(win);

      listener({ sender: { hostWebContents: null } });

      expect(win.close).toHaveBeenCalledTimes(1);
    });

    it('falls back to the host window for a webview-guest sender', async () => {
      const { listener, fromWebContents } = await getCloseHandler();
      const hostWebContents = { id: 5 };
      const win = { isDestroyed: jest.fn(() => false), close: jest.fn() };
      // Guest sender resolves to null; the hostWebContents resolves to the window.
      fromWebContents.mockReturnValueOnce(null).mockReturnValueOnce(win);

      listener({ sender: { hostWebContents } });

      expect(fromWebContents).toHaveBeenNthCalledWith(2, hostWebContents);
      expect(win.close).toHaveBeenCalledTimes(1);
    });

    it('does not close an already-destroyed window', async () => {
      const { listener, fromWebContents } = await getCloseHandler();
      const win = { isDestroyed: jest.fn(() => true), close: jest.fn() };
      fromWebContents.mockReturnValue(win);

      listener({ sender: { hostWebContents: null } });

      expect(win.close).not.toHaveBeenCalled();
    });

    it('no-ops safely when no window resolves', async () => {
      const { listener, fromWebContents } = await getCloseHandler();
      fromWebContents.mockReturnValue(null);

      expect(() =>
        listener({ sender: { hostWebContents: null } })
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // same-conference reopen: focus the existing window instead of recreating
  // -------------------------------------------------------------------------
  describe('same-conference reopen', () => {
    it('focuses the existing window (no recreate, no close) for the same URL', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      const { openWindow } = await loadModule();

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-x');
      expect(createdWindows).toHaveLength(1);
      const win = createdWindows[0] as any;

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-x');

      expect(createdWindows).toHaveLength(1); // not recreated
      expect(win.close).not.toHaveBeenCalled();
      expect(win.show).toHaveBeenCalledTimes(1);
      expect(win.focus).toHaveBeenCalledTimes(1);
    });

    it('restores first when the existing window is minimized', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      const { openWindow } = await loadModule();

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-y');
      const win = createdWindows[0] as any;
      win.isMinimized.mockReturnValue(true);

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-y');

      expect(win.restore).toHaveBeenCalledTimes(1);
      expect(win.focus).toHaveBeenCalledTimes(1);
      expect(createdWindows).toHaveLength(1);
    });

    it('recreates the window for a different conference URL', async () => {
      getServerUrlByWebContentsId.mockReturnValue('https://chat.example');
      const { openWindow } = await loadModule();

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-1');
      const first = createdWindows[0] as any;

      await open(openWindow, makeCallerWc(1), 'https://meet.example/room-2');

      expect(createdWindows).toHaveLength(2);
      expect(first.close).toHaveBeenCalled();
    });
  });
});
