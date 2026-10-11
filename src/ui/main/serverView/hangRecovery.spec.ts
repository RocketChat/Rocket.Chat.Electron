import type { WebContents } from 'electron';

import { dispatch, listen, select } from '../../../store';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  WEBVIEW_ATTACHED,
  WEBVIEW_BECAME_RESPONSIVE,
  WEBVIEW_DID_FAIL_LOAD,
} from '../../actions';
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECOVERY_KILL_TIMEOUT_MS,
} from './hangRecovery';
import { attachGuestWebContentsEvents } from './index';
import {
  HELD_NAVIGATION_RETRY_MS,
  REACHABILITY_PROBE_DELAY_MS,
  RECONNECT_PROBE_INTERVAL_MS,
} from './stuckNavigation';

jest.mock('electron', () => ({
  app: {
    userAgentFallback: 'test-agent',
    name: 'Rocket.Chat',
    getVersion: jest.fn(() => '1.0.0'),
  },
  clipboard: { writeText: jest.fn() },
  Menu: { buildFromTemplate: jest.fn(() => ({ popup: jest.fn() })) },
  webContents: { fromId: jest.fn() },
  powerMonitor: { on: jest.fn(), off: jest.fn() },
}));

jest.mock('../../../app/main/dev', () => ({ setupPreloadReload: jest.fn() }));
jest.mock('../../../ipc/main', () => ({ handle: jest.fn() }));
jest.mock('../../../navigation/main', () => ({ isProtocolAllowed: jest.fn() }));
jest.mock('../../../screenSharing/serverViewScreenSharing', () => ({
  setupServerViewDisplayMedia: jest.fn(),
}));
jest.mock('../../../servers/bootWatchdog', () => ({
  attachBootWatchdog: jest.fn(),
}));
jest.mock('../../../logging/scopes', () => ({
  loggers: { servers: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
  listen: jest.fn(),
  select: jest.fn(),
}));
jest.mock('../../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));
jest.mock('../mediaPermissions', () => ({
  handleMediaPermissionRequest: jest.fn(),
}));
jest.mock('../rootWindow', () => ({
  getRootWindow: jest.fn(() =>
    Promise.resolve({
      webContents: { addListener: jest.fn(), send: jest.fn() },
    })
  ),
}));
jest.mock('./popupMenu', () => ({ createPopupMenuForServerView: jest.fn() }));

const SERVER_URL = 'https://open.rocket.chat/';

const mockDispatch = dispatch as unknown as jest.Mock;
const mockListen = listen as unknown as jest.Mock;
const mockSelect = select as unknown as jest.Mock;

const listenerFor = (actionType: string) =>
  mockListen.mock.calls.find(([type]) => type === actionType)?.[1] as (
    action: unknown
  ) => void;

const mockLoggers = jest.requireMock('../../../logging/scopes').loggers;

const createGuestWebContents = () => {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const register = (event: string, handler: any) => {
    handlers.set(event, [...(handlers.get(event) ?? []), handler]);
  };
  const guest = {
    addListener: jest.fn(register),
    once: jest.fn(register),
    removeListener: jest.fn((event: string, handler: any) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((h) => h !== handler)
      );
    }),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    session: {
      fetch: jest.fn(() => Promise.resolve({ status: 200 })),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      flushStorageData: jest.fn(),
      clearStorageData: jest.fn(),
    },
    isDestroyed: jest.fn(() => false),
    isLoading: jest.fn(() => false),
    isWaitingForResponse: jest.fn(() => false),
    forcefullyCrashRenderer: jest.fn(),
    loadURL: jest.fn(() => Promise.resolve()),
    executeJavaScript: jest.fn(() => Promise.resolve(0)),
  };
  const emit = (event: string, ...args: unknown[]) =>
    handlers.get(event)?.forEach((handler) => handler({}, ...args));
  return { guest, emit };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const failLoadDispatches = () =>
  mockDispatch.mock.calls.filter(
    ([action]) => action.type === WEBVIEW_DID_FAIL_LOAD
  );

describe('server view hang and crash recovery', () => {
  let guest: ReturnType<typeof createGuestWebContents>['guest'];
  let emit: ReturnType<typeof createGuestWebContents>['emit'];
  let servers: { url: string }[];

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    jest.clearAllMocks();
    servers = [{ url: SERVER_URL }];
    mockSelect.mockImplementation((selector) => selector({ servers }));

    await attachGuestWebContentsEvents();

    ({ guest, emit } = createGuestWebContents());
    (
      jest.requireMock('electron').webContents.fromId as jest.Mock
    ).mockReturnValue(guest as unknown as WebContents);

    listenerFor(WEBVIEW_ATTACHED)({
      payload: { webContentsId: 1, url: SERVER_URL },
    });
    mockDispatch.mockClear();
  });

  afterEach(() => {
    emit('destroyed');
    jest.useRealTimers();
  });

  const clickErrorViewReload = () =>
    listenerFor(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED)({
      payload: { url: SERVER_URL },
    });

  it('shows the failure view when the renderer becomes unresponsive', () => {
    emit('unresponsive');

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: SERVER_URL, isMainFrame: true },
    });
  });

  it('restores the server view when the renderer recovers by itself', () => {
    emit('unresponsive');
    emit('responsive');

    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: WEBVIEW_BECAME_RESPONSIVE,
      payload: { url: SERVER_URL },
    });
  });

  it('reloads from the failure view only after the killed renderer exits', async () => {
    emit('unresponsive');
    clickErrorViewReload();
    await flushPromises();

    expect(guest.forcefullyCrashRenderer).toHaveBeenCalledTimes(1);
    expect(guest.loadURL).not.toHaveBeenCalled();

    emit('render-process-gone', { reason: 'killed', exitCode: 9 });
    await flushPromises();

    expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
  });

  it('reloads anyway when the killed renderer never reports its exit', async () => {
    emit('unresponsive');
    clickErrorViewReload();

    await jest.advanceTimersByTimeAsync(RECOVERY_KILL_TIMEOUT_MS);

    expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
  });

  it('does not report the renderer it killed for recovery as a crash', async () => {
    emit('unresponsive');
    clickErrorViewReload();
    await flushPromises();
    mockDispatch.mockClear();

    emit('render-process-gone', { reason: 'killed', exitCode: 9 });

    expect(failLoadDispatches()).toHaveLength(0);
  });

  it('reloads a responsive renderer without killing it', async () => {
    clickErrorViewReload();
    await flushPromises();

    expect(guest.forcefullyCrashRenderer).not.toHaveBeenCalled();
    expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
  });

  it('does not kill the renderer again once it has recovered', () => {
    emit('unresponsive');
    emit('responsive');
    clickErrorViewReload();

    expect(guest.forcefullyCrashRenderer).not.toHaveBeenCalled();
  });

  it('shows the failure view when the renderer crashes', () => {
    emit('render-process-gone', { reason: 'crashed', exitCode: 11 });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: SERVER_URL, isMainFrame: true },
    });
  });

  it('logs a main-frame load failure and shows the failure view', () => {
    emit('did-fail-load', -106, 'ERR_INTERNET_DISCONNECTED', SERVER_URL, true);

    expect(mockLoggers.servers.warn).toHaveBeenCalledWith(
      `Server view failed to load (ERR_INTERNET_DISCONNECTED, -106): ${SERVER_URL}`
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: SERVER_URL, isMainFrame: true },
    });
  });

  it('reloads as soon as the server answers after a network failure', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    guest.session.fetch
      .mockRejectedValueOnce(new Error('net::ERR_INTERNET_DISCONNECTED'))
      .mockResolvedValue({ status: 200 });
    emit('did-fail-load', -106, 'ERR_INTERNET_DISCONNECTED', SERVER_URL, true);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS);
    expect(guest.loadURL).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS);
    expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
    expect(guest.session.fetch).toHaveBeenCalledWith(
      SERVER_URL,
      expect.objectContaining({ credentials: 'omit' })
    );
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('stops waiting for the server once another load starts', async () => {
    guest.session.fetch.mockRejectedValueOnce(
      new Error('net::ERR_INTERNET_DISCONNECTED')
    );
    emit('did-fail-load', -106, 'ERR_INTERNET_DISCONNECTED', SERVER_URL, true);
    emit('did-start-loading');

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 3);

    expect(guest.session.fetch).not.toHaveBeenCalled();
    expect(guest.loadURL).not.toHaveBeenCalled();
  });

  it('does not wait for the server after a failure that is not about the network', async () => {
    emit('did-fail-load', -201, 'ERR_CERT_DATE_INVALID', SERVER_URL, true);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 3);

    expect(guest.session.fetch).not.toHaveBeenCalled();
  });

  describe('a navigation that never gets its response', () => {
    const startHeldNavigation = () => {
      guest.isLoading.mockReturnValue(true);
      guest.isWaitingForResponse.mockReturnValue(true);
      // Electron passes the navigation details on the event object itself.
      guest.addListener.mock.calls
        .filter(([event]) => event === 'did-start-navigation')
        .forEach(([, handler]) =>
          handler({ isMainFrame: true, isSameDocument: false })
        );
    };

    it('shows the failure view when the server is unreachable', async () => {
      guest.session.fetch.mockRejectedValue(
        new Error('net::ERR_NAME_NOT_RESOLVED')
      );
      startHeldNavigation();

      await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: WEBVIEW_DID_FAIL_LOAD,
        payload: { url: SERVER_URL, isMainFrame: true },
      });
    });

    it('clears the failure view when the page commits after all', async () => {
      guest.session.fetch.mockRejectedValue(
        new Error('net::ERR_NAME_NOT_RESOLVED')
      );
      startHeldNavigation();
      await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);

      emit('did-navigate', SERVER_URL);

      expect(mockDispatch).toHaveBeenLastCalledWith({
        type: WEBVIEW_BECAME_RESPONSIVE,
        payload: { url: SERVER_URL },
      });
      await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 5);
      expect(guest.loadURL).not.toHaveBeenCalled();
    });

    it('loads the page again when the server answers', async () => {
      startHeldNavigation();

      await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS);

      expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
      expect(failLoadDispatches()).toHaveLength(0);
    });
  });

  it('does not log subframe load failures', () => {
    emit('did-fail-load', -105, 'ERR_NAME_NOT_RESOLVED', SERVER_URL, false);

    expect(mockLoggers.servers.warn).not.toHaveBeenCalled();
  });

  it('ignores a clean renderer exit', () => {
    emit('render-process-gone', { reason: 'clean-exit', exitCode: 0 });

    expect(failLoadDispatches()).toHaveLength(0);
  });

  it('does not mark a server that was removed as failed', () => {
    servers = [];

    emit('unresponsive');
    emit('render-process-gone', { reason: 'crashed', exitCode: 11 });

    expect(failLoadDispatches()).toHaveLength(0);
  });

  describe('heartbeat', () => {
    const hangRenderer = () => {
      let answer: (value: number) => void = () => undefined;
      guest.executeJavaScript.mockImplementation(
        () =>
          new Promise((resolve) => {
            answer = resolve;
          })
      );
      return () => answer(0);
    };

    it('stays quiet while the page answers', async () => {
      await jest.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 10);

      expect(guest.executeJavaScript).toHaveBeenCalled();
      expect(failLoadDispatches()).toHaveLength(0);
    });

    it('shows the failure view when the page stops answering', () => {
      hangRenderer();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS - HEARTBEAT_INTERVAL_MS);
      expect(failLoadDispatches()).toHaveLength(0);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(failLoadDispatches()).toHaveLength(1);
    });

    it('lets the failure view kill the renderer it found stuck', async () => {
      hangRenderer();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS);

      clickErrorViewReload();
      await flushPromises();
      emit('render-process-gone', { reason: 'killed', exitCode: 9 });
      await flushPromises();

      expect(guest.forcefullyCrashRenderer).toHaveBeenCalledTimes(1);
      expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
    });

    it('restores the server view when the stuck page answers again', async () => {
      const answer = hangRenderer();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS);

      answer();
      await flushPromises();

      expect(mockDispatch).toHaveBeenLastCalledWith({
        type: WEBVIEW_BECAME_RESPONSIVE,
        payload: { url: SERVER_URL },
      });
    });

    it('does not treat a probe dropped by a navigation as a hang', async () => {
      guest.executeJavaScript.mockImplementation(() =>
        Promise.reject(new Error('Render frame was disposed'))
      );

      await jest.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 10);

      expect(failLoadDispatches()).toHaveLength(0);
    });

    it('watches the fresh renderer after a recovery kill', async () => {
      hangRenderer();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS);
      clickErrorViewReload();
      await flushPromises();
      emit('render-process-gone', { reason: 'killed', exitCode: 9 });
      await flushPromises();
      expect(guest.loadURL).toHaveBeenCalledWith(SERVER_URL);
      mockDispatch.mockClear();

      hangRenderer();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS);

      expect(failLoadDispatches()).toHaveLength(1);
    });

    it('stops probing once the server view is destroyed', () => {
      emit('destroyed');
      guest.executeJavaScript.mockClear();

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);

      expect(guest.executeJavaScript).not.toHaveBeenCalled();
    });
  });
});
