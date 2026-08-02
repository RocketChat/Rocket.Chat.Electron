/**
 * Exercise preload modules from the main/node Jest project so Istanbul
 * coverage counts them under `yarn test:coverage` (renderer preload specs are
 * skipped when --coverage is set due to EvalError).
 */

const dispatch = jest.fn();
const request = jest.fn();
const listen = jest.fn(() => jest.fn());
const watch = jest.fn(() => jest.fn());
const select = jest.fn((sel: any) => {
  try {
    return sel({
      e2ePdfPreviewSizeLimit: 10,
      servers: [{ url: 'https://open.rocket.chat' }],
      isInternalVideoChatWindowEnabled: true,
      navigationLayout: 'sideBar',
    });
  } catch {
    return undefined;
  }
});

jest.mock('../../store', () => ({
  dispatch: (...args: any[]) => (dispatch as any)(...args),
  request: (...args: any[]) => (request as any)(...args),
  listen: (...args: any[]) => (listen as any)(...args),
  select: (...args: any[]) => (select as any)(...args),
  safeSelect: (sel: any) => {
    try {
      return select(sel);
    } catch {
      return undefined;
    }
  },
  watch: (...args: any[]) => (watch as any)(...args),
}));

jest.mock('../preload/urls', () => ({
  getServerUrl: jest.fn(() => 'https://open.rocket.chat'),
  getAbsoluteUrl: jest.fn((p: string) =>
    p?.startsWith('http') ? p : `https://open.rocket.chat${p || ''}`
  ),
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../../ipc/renderer', () => ({
  invoke: jest.fn(async () => 'active'),
  invokeWithRetry: jest.fn(async () => ({ language: 'en' })),
}));

const ipcInvoke = jest.fn(async (..._args: any[]) => undefined) as jest.Mock;
const ipcSend = jest.fn();
const ipcSendSync = jest.fn((..._args: any[]) => 'jitsi');
const ipcOn = jest.fn();
const ipcOnce = jest.fn();
const ipcRemoveListener = jest.fn();
const ipcRemoveAllListeners = jest.fn();
const exposeInMainWorld = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: (...args: any[]) => (ipcInvoke as any)(...args),
    send: (...args: any[]) => (ipcSend as any)(...args),
    sendSync: (...args: any[]) => (ipcSendSync as any)(...args),
    on: (...args: any[]) => (ipcOn as any)(...args),
    once: (...args: any[]) => (ipcOnce as any)(...args),
    removeListener: (...args: any[]) => (ipcRemoveListener as any)(...args),
    removeAllListeners: (...args: any[]) =>
      (ipcRemoveAllListeners as any)(...args),
  },
  contextBridge: {
    exposeInMainWorld: (...args: any[]) => (exposeInMainWorld as any)(...args),
  },
  webFrame: { setZoomFactor: jest.fn() },
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(() => 'clip'),
  },
  nativeImage: {
    createFromDataURL: jest.fn(() => ({})),
    createFromPath: jest.fn(() => ({})),
  },
}));

const installDomGlobals = (): void => {
  const styleEl = {
    id: '',
    style: {} as Record<string, string>,
    classList: { add: jest.fn() },
    remove: jest.fn(),
    innerHTML: '',
  };
  const body = {
    append: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  };
  const head = {
    append: jest.fn(),
    appendChild: jest.fn(),
  };
  const canvasCtx = {
    clearRect: jest.fn(),
    drawImage: jest.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => canvasCtx),
    toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
  };
  const imageListeners: Record<string, Function[]> = {};
  const image = {
    src: '',
    addEventListener: jest.fn((event: string, cb: Function) => {
      imageListeners[event] = imageListeners[event] || [];
      imageListeners[event].push(cb);
    }),
  };

  (global as any).document = {
    body,
    head: {
      ...head,
      appendChild: jest.fn((el: any) => {
        // Resolve script loads immediately so loadJitsiScript does not hang
        if (el && typeof el.onload === 'function') {
          queueMicrotask(() => el.onload());
        }
        return el;
      }),
    },
    readyState: 'complete',
    createElement: jest.fn((tag: string) => {
      if (tag === 'canvas') return canvas;
      if (tag === 'img') return image;
      if (tag === 'style') return { ...styleEl, style: {} };
      if (tag === 'script') {
        return {
          src: '',
          async: false,
          onload: null as null | Function,
          onerror: null as null | Function,
        };
      }
      if (tag === 'div') {
        return {
          style: {} as Record<string, string>,
          classList: { add: jest.fn(), contains: jest.fn(() => false) },
          remove: jest.fn(),
          closest: jest.fn(() => null),
          querySelector: jest.fn(() => null),
        };
      }
      return { style: {}, classList: { add: jest.fn() }, remove: jest.fn() };
    }),
    createElementNS: jest.fn(),
    getElementById: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  (global as any).window = {
    location: {
      origin: 'https://open.rocket.chat',
      href: 'https://open.rocket.chat/home',
      hostname: 'open.rocket.chat',
      pathname: '/home',
      protocol: 'https:',
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getComputedStyle: jest.fn(() => ({
      background: 'rgb(0,0,0)',
      color: 'rgb(255,255,255)',
      border: '1px solid #000',
    })),
    top: { postMessage: jest.fn() },
    localStorage: {
      getItem: jest.fn((key: string) => {
        if (key === 'Meteor.loginToken') return 'token';
        if (key === 'Meteor.userId') return 'user-1';
        return null;
      }),
      setItem: jest.fn(),
    },
    // Pre-install so initializeJitsiApi skips script load path when set
    JitsiMeetExternalAPI: function MockJitsi() {
      return {
        executeCommand: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispose: jest.fn(),
      };
    },
  };

  (global as any).localStorage = (global as any).window.localStorage;
  (global as any).Image = function ImageMock(this: any) {
    Object.assign(this, image);
    return this;
  };
  (global as any).MutationObserver = class {
    observe = jest.fn();
    disconnect = jest.fn();
    constructor(public cb: Function) {}
  };
  (global as any).fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ roles: ['user', 'admin'] }),
  }));
};

describe('preload modules coverage (node env)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    installDomGlobals();
    request.mockResolvedValue('notif-id');
    ipcInvoke.mockResolvedValue(undefined);
  });

  it('covers small servers/preload setters', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setBadge } = require('../preload/badge');
    setBadge(3);
    setBadge('•');
    setBadge(undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { writeTextToClipboard } = require('../preload/clipboard');
    writeTextToClipboard('hello');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setVersion } = require('../preload/version');
    setVersion('6.5.0');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setWorkspaceUID } = require('../preload/uniqueID');
    setWorkspaceUID('uid-1');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setTitle } = require('../preload/title');
    setTitle('Community');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setGitCommitHash } = require('../preload/gitCommitHash');
    setGitCommitHash('deadbeef');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { reloadServer } = require('../preload/reloadServer');
    reloadServer();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { openInBrowser } = require('../preload/openInBrowser');
    openInBrowser('https://example.com');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setUserLoggedIn } = require('../preload/userLoggedIn');
    setUserLoggedIn(true);
    setUserLoggedIn(false);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setUserThemeAppearance } = require('../preload/themeAppearance');
    setUserThemeAppearance('dark');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      getE2ePdfPreviewSizeLimit,
    } = require('../preload/e2ePdfPreviewSizeLimit');
    expect(getE2ePdfPreviewSizeLimit()).toEqual(expect.any(Number));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      openDocumentViewer,
      supportedDocumentViewerFormats,
    } = require('../preload/documentViewer');
    expect(supportedDocumentViewerFormats().length).toBeGreaterThan(0);
    openDocumentViewer('https://open.rocket.chat/file.pdf', 'pdf', {});

    expect(dispatch).toHaveBeenCalled();
  });

  it('covers favicon and sidebar with DOM mocks', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setFavicon } = require('../preload/favicon');
    setFavicon('https://open.rocket.chat/favicon.ico');
    setFavicon(null as any);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      setServerVersionToSidebar,
      setBackground,
      setSidebarCustomTheme,
    } = require('../preload/sidebar');
    setServerVersionToSidebar('6.0.0');
    setBackground('https://open.rocket.chat/bg.png');
    setBackground('');
    setServerVersionToSidebar('6.3.0');
    setBackground('https://open.rocket.chat/bg2.png');
    setSidebarCustomTheme('{"color":"#000"}');
    expect(dispatch).toHaveBeenCalled();
  });

  it('covers userRoles bridge and REST fallback', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      setUserRoles,
      updateUserRoles,
      clearUserRoles,
    } = require('../preload/userRoles');

    setUserRoles(['admin', 1, 'user'] as any);
    await updateUserRoles(); // bridge already provided → skip
    clearUserRoles();

    // After clear, REST path can run
    await updateUserRoles();
    setUserRoles('not-array' as any);
    expect(dispatch).toHaveBeenCalled();
  });

  it('covers internal video chat window open paths', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      openInternalVideoChatWindow,
      getInternalVideoChatWindowEnabled,
    } = require('../preload/internalVideoChatWindow');

    expect(getInternalVideoChatWindowEnabled()).toBe(true);

    openInternalVideoChatWindow('https://meet.example/room', {
      providerName: 'jitsi',
    });
    openInternalVideoChatWindow('https://meet.google.com/abc', {
      providerName: 'googlemeet',
    });
    openInternalVideoChatWindow('https://pexip.example/room', {
      providerName: 'pexip',
    });
    openInternalVideoChatWindow('https://other.example/room', undefined);
    openInternalVideoChatWindow('ftp://bad.example/room', undefined);

    // MAS / disabled path falls back to external
    const originalMas = (process as any).mas;
    try {
      (process as any).mas = true;
      openInternalVideoChatWindow('https://meet.example/room', {
        providerName: 'jitsi',
      });
    } finally {
      (process as any).mas = originalMas;
    }

    expect(ipcInvoke).toHaveBeenCalled();
  });

  it('covers notifications/preload createNotification paths', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createNotification,
      destroyNotification,
      dispatchCustomNotification,
      closeCustomNotification,
      listenToNotificationsRequests,
    } = require('../../notifications/preload');

    const onEvent = jest.fn();
    const id = await createNotification({
      title: 'Hello',
      body: 'World',
      icon: '/static/icon.png',
      notificationType: 'text',
      category: 'SERVER',
      onEvent,
    });
    expect(id).toBe('notif-id');

    await createNotification({
      title: 'Voice',
      body: 'Call',
      icon: 'data:image/png;base64,abc',
      notificationType: 'voice',
      category: 'DOWNLOADS',
    });

    await createNotification({
      title: 'No icon',
      body: 'x',
    });

    await dispatchCustomNotification({
      type: 'text',
      payload: {
        title: 'Custom',
        body: 'Body',
        avatar: 'https://cdn.example/a.png',
        requireInteraction: true,
      },
    });

    destroyNotification(id);
    closeCustomNotification(id);
    listenToNotificationsRequests();

    // Fire each listen callback registered
    for (const call of listen.mock.calls as any[]) {
      const matcher = call[0];
      const handler = call[1] as Function | undefined;
      if (!handler) continue;
      const payloadBase = { id, serverUrl: 'https://open.rocket.chat' };
      try {
        if (typeof matcher === 'string') {
          handler({
            type: matcher,
            payload: {
              ...payloadBase,
              category: 'SERVER',
              reply: 'hi',
              index: 0,
            },
          });
          handler({
            type: matcher,
            payload: { ...payloadBase, category: 'DOWNLOADS' },
          });
        } else if (typeof matcher !== 'function') {
          handler({
            type: matcher?.type || 'test',
            payload: {
              ...payloadBase,
              category: 'SERVER',
              reply: 'hi',
              index: 0,
            },
          });
        }
      } catch {
        // ignore handler shape mismatches
      }
    }

    expect(request).toHaveBeenCalled();
    expect(listen).toHaveBeenCalled();
  });

  it('covers navigateToRoute buffering and delivery', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      onNavigateToRoute,
      listenToNavigateToRouteRequests,
    } = require('../preload/navigateToRoute');

    listenToNavigateToRouteRequests();
    listenToNavigateToRouteRequests(); // idempotent

    expect(ipcOn).toHaveBeenCalledWith(
      'navigate-to-route',
      expect.any(Function)
    );
    const handler = ipcOn.mock.calls.find(
      ([ch]) => ch === 'navigate-to-route'
    )?.[1] as Function;

    // Path arrives before callback is registered → buffered
    handler({}, '/channel/general');
    const cb = jest.fn();
    onNavigateToRoute(cb);
    expect(cb).toHaveBeenCalledWith('/channel/general');

    // Subsequent path delivered immediately
    handler({}, '/group/ops');
    expect(cb).toHaveBeenCalledWith('/group/ops');
  });

  it('covers outlook, userPresence, messageBox, ui sidebar, screenSharing preloads', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const outlook = require('../../outlookCalendar/preload');
    ipcInvoke.mockResolvedValueOnce({ status: 'success', events: [] });
    await outlook.getOutlookEvents(new Date('2026-01-01'));
    ipcInvoke.mockRejectedValueOnce(new Error('net'));
    await expect(outlook.getOutlookEvents(new Date())).rejects.toThrow();
    ipcInvoke.mockResolvedValue(true);
    outlook.setOutlookExchangeUrl('https://exchange.example', 'u1');
    await outlook.hasOutlookCredentials();
    ipcInvoke.mockRejectedValueOnce(new Error('fail'));
    await expect(outlook.hasOutlookCredentials()).resolves.toBe(false);
    outlook.clearOutlookCredentials();
    outlook.setUserToken('tok', 'u1');
    // rejection paths for fire-and-forget
    ipcInvoke.mockRejectedValueOnce(new Error('x'));
    outlook.setOutlookExchangeUrl('https://exchange.example', 'u1');
    ipcInvoke.mockRejectedValueOnce(new Error('x'));
    outlook.clearOutlookCredentials();
    ipcInvoke.mockRejectedValueOnce(new Error('x'));
    outlook.setUserToken('tok', 'u1');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setUserPresenceDetection } = require('../../userPresence/preload');
    jest.useFakeTimers();
    setUserPresenceDetection({
      isAutoAwayEnabled: true,
      idleThreshold: 60,
      setUserOnline: jest.fn(),
    });
    setUserPresenceDetection({
      isAutoAwayEnabled: false,
      idleThreshold: null,
      setUserOnline: jest.fn(),
    });
    // fire power-monitor listen handlers
    for (const call of listen.mock.calls as any[]) {
      const matcher = call[0];
      const handler = call[1] as Function | undefined;
      try {
        if (typeof matcher === 'function' && handler) {
          handler({ type: 'SYSTEM_SUSPENDING' });
        }
      } catch {
        // ignore
      }
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { listenToMessageBoxEvents } = require('../../ui/preload/messageBox');
    listenToMessageBoxEvents();
    expect(document.addEventListener).toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleTrafficLightsSpacing } = require('../../ui/preload/sidebar');
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
    handleTrafficLightsSpacing();
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    handleTrafficLightsSpacing();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      listenToScreenSharingRequests,
    } = require('../../screenSharing/preload');
    listenToScreenSharingRequests();
    expect(window.addEventListener).toHaveBeenCalledWith(
      'get-sourceId',
      expect.any(Function)
    );
  });

  it('covers jitsi preload and video-call preload index', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jitsi = require('../../jitsi/preload');
    expect(jitsi.desktopCapturer).toBeDefined();
    expect(jitsi.JitsiMeetElectron).toBeDefined();

    ipcInvoke.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Screen',
        display_id: '1',
        thumbnail: { toDataURL: () => 'data:thumb' },
        appIcon: { toDataURL: () => 'data:icon' },
      },
    ]);
    await jitsi.JitsiMeetElectron.obtainDesktopStreams(
      jest.fn(),
      jest.fn(),
      { types: ['screen'] }
    );
    ipcInvoke.mockRejectedValueOnce(new Error('denied'));
    await jitsi.JitsiMeetElectron.obtainDesktopStreams(
      jest.fn(),
      jest.fn(),
      { types: ['window'] }
    );

    jest.resetModules();
    installDomGlobals();
    ipcSendSync.mockReturnValue('jitsi');
    // Auto-resolve screen-share once listener so requestScreenSharing does not hang
    ipcOnce.mockImplementation((channel: string, handler: Function) => {
      if (channel === 'video-call-window/screen-sharing-source-responded') {
        queueMicrotask(() => handler({}, 'source-1'));
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../videoCallWindow/preload/index');
    const api = exposeInMainWorld.mock.calls.find(
      ([name]) => name === 'videoCallWindow'
    )?.[1];
    expect(api).toBeDefined();
    api.openInMainWindow('/channel/general');
    api.openInMainWindow('https://evil.example');
    api.openInMainWindow('//host');
    api.close();
    ipcInvoke.mockResolvedValue(undefined);
    await api.requestScreenSharing();
    await api.getAuthCredentials();
  });

  it('covers jitsiBridge initialize and helpers', async () => {
    ipcSendSync.mockReturnValue('jitsi');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../videoCallWindow/preload/jitsiBridge');
    const b = (window as any).jitsiBridge;
    expect(b).toBeTruthy();
    await b.initializeJitsiApi({ domain: '', roomName: '' });
    await b.initializeJitsiApi({
      domain: 'meet.jit.si',
      roomName: 'RoomName',
    });
    await b.initializeJitsiApi({
      domain: 'meet.jit.si',
      roomName: 'RoomName',
    });
    expect(b.isInitialized()).toBe(true);
    expect(b.getCurrentDomain()).toBe('meet.jit.si');
    expect(b.getCurrentRoomName()).toBe('RoomName');
    await b.startScreenSharing();
    await b.getJitsiVersion();

    const obtainer = (window as any).JitsiMeetScreenObtainer;
    if (obtainer?.openDesktopPicker) {
      const success = jest.fn();
      const error = jest.fn();
      obtainer.openDesktopPicker({}, success, error);
      const onHandler = (ipcOn.mock.calls as any[]).find(
        ([ch]) => ch === 'video-call-window/screen-sharing-source-responded'
      )?.[1];
      onHandler?.({}, 'screen:0:0');
      obtainer.openDesktopPicker({}, success, error);
      obtainer.openDesktopPicker({}, success, error);
      const onHandler2 = (ipcOn.mock.calls as any[])
        .filter(
          ([ch]) => ch === 'video-call-window/screen-sharing-source-responded'
        )
        .pop()?.[1];
      onHandler2?.({}, null);
    }
    b.endCall();
    b.dispose();
    expect(window.addEventListener).toHaveBeenCalled();
  });

  it('skips jitsiBridge when provider is not jitsi', () => {
    ipcSendSync.mockReturnValue('pexip');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../videoCallWindow/preload/jitsiBridge');
    expect(mod.default).toBeNull();
  });
});
