import type { WebContents } from 'electron';

import {
  HELD_NAVIGATION_RETRY_MS,
  PROBE_TIMED_OUT,
  REACHABILITY_PROBE_DELAY_MS,
  RECONNECT_PROBE_INTERVAL_MS,
  RECONNECT_PROBE_MAX_INTERVAL_MS,
  STUCK_NAVIGATION_TIMEOUT_MS,
  nextReconnectDelay,
  probeServer,
  waitUntilReachable,
  watchStuckNavigation,
} from './stuckNavigation';
import type { ReconnectBackoff } from './stuckNavigation';

const SERVER_URL = 'https://open.rocket.chat/';

const createGuest = ({ loading = false } = {}) => {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const guest = {
    addListener: jest.fn((event: string, handler: any) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    isDestroyed: jest.fn(() => false),
    isLoading: jest.fn(() => loading),
    isWaitingForResponse: jest.fn(() => loading),
  };
  const emit = (event: string, ...args: unknown[]) =>
    handlers.get(event)?.forEach((handler) => handler(...args));
  const startMainFrameNavigation = () => {
    guest.isLoading.mockReturnValue(true);
    guest.isWaitingForResponse.mockReturnValue(true);
    emit('did-start-navigation', { isMainFrame: true, isSameDocument: false });
  };
  return {
    guest: guest as unknown as WebContents,
    mock: guest,
    emit,
    startMainFrameNavigation,
  };
};

const reachable = jest.fn(async (): Promise<string | null> => null);
const unreachable = jest.fn(
  async (): Promise<string | null> => 'ERR_NAME_NOT_RESOLVED'
);

const createCallbacks = () => ({
  onStuck: jest.fn(),
  onHeld: jest.fn(),
  onRecovered: jest.fn(),
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('watchStuckNavigation', () => {
  it('reports a navigation to an unreachable server after the probe delay', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);

    expect(unreachable).toHaveBeenCalledWith(guest, SERVER_URL);
    expect(callbacks.onStuck).toHaveBeenCalledWith(
      'server unreachable (ERR_NAME_NOT_RESOLVED)',
      true
    );
    expect(callbacks.onHeld).not.toHaveBeenCalled();
  });

  it('loads a held navigation again once the server answers', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, reachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS - 1);
    expect(callbacks.onHeld).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(callbacks.onHeld).toHaveBeenCalledTimes(1);
    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });

  it('does not restart a slow server in a loop', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, reachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS);
    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(callbacks.onHeld).toHaveBeenCalledTimes(1);
    expect(callbacks.onStuck).toHaveBeenCalledWith(
      'no response in 30 s',
      false
    );
  });

  it('allows another retry after a navigation completed', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, reachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS);
    emit('did-navigate');
    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS);

    expect(callbacks.onHeld).toHaveBeenCalledTimes(2);
  });

  it('does not take a first probe without an answer for a dead server', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    const probe = jest
      .fn()
      .mockResolvedValueOnce(PROBE_TIMED_OUT)
      .mockResolvedValue(null);
    watchStuckNavigation(guest, SERVER_URL, callbacks, probe);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);

    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });

  it('reports the server unreachable when the second probe gets no answer either', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    const probe = jest.fn().mockResolvedValue(PROBE_TIMED_OUT);
    watchStuckNavigation(guest, SERVER_URL, callbacks, probe);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(HELD_NAVIGATION_RETRY_MS);

    expect(callbacks.onStuck).toHaveBeenCalledWith(
      `server unreachable (${PROBE_TIMED_OUT})`,
      true
    );
    expect(callbacks.onHeld).not.toHaveBeenCalled();
  });

  it('reports a stuck navigation that commits after all as recovered', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);
    emit('did-navigate');

    expect(callbacks.onRecovered).toHaveBeenCalledTimes(1);
  });

  it('does not report an ordinary commit as recovered', () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    emit('did-navigate');

    expect(callbacks.onRecovered).not.toHaveBeenCalled();
  });

  it('does not report a later navigation as recovered', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);
    startMainFrameNavigation();
    emit('did-navigate');

    expect(callbacks.onRecovered).not.toHaveBeenCalled();
  });

  it('reports a navigation that started before the watch', async () => {
    const { guest } = createGuest({ loading: true });
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);

    expect(callbacks.onStuck).toHaveBeenCalledTimes(1);
  });

  it('reports a stuck navigation only once', async () => {
    const { guest, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(callbacks.onStuck).toHaveBeenCalledTimes(1);
    expect(unreachable).toHaveBeenCalledTimes(1);
  });

  it('does not probe a navigation that committed', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    emit('did-navigate');
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(unreachable).not.toHaveBeenCalled();
    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });

  it('does not probe a navigation that stopped loading', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    emit('did-stop-loading');
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(unreachable).not.toHaveBeenCalled();
  });

  it('does not probe a page that got its response but is still loading', async () => {
    const { guest, mock, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    startMainFrameNavigation();
    mock.isWaitingForResponse.mockReturnValue(false);
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(unreachable).not.toHaveBeenCalled();
    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });

  it('drops a probe result that arrives after the navigation committed', async () => {
    const { guest, emit, startMainFrameNavigation } = createGuest();
    const callbacks = createCallbacks();
    let finishProbe: (reason: string | null) => void = () => undefined;
    const slowProbe = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finishProbe = resolve;
        })
    );
    watchStuckNavigation(guest, SERVER_URL, callbacks, slowProbe);

    startMainFrameNavigation();
    await jest.advanceTimersByTimeAsync(REACHABILITY_PROBE_DELAY_MS);
    emit('did-navigate');
    finishProbe('ERR_NAME_NOT_RESOLVED');
    await jest.advanceTimersByTimeAsync(0);

    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });

  it('ignores subframe and same-document navigations', async () => {
    const { guest, mock, emit } = createGuest();
    const callbacks = createCallbacks();
    watchStuckNavigation(guest, SERVER_URL, callbacks, unreachable);

    mock.isLoading.mockReturnValue(true);
    mock.isWaitingForResponse.mockReturnValue(true);
    emit('did-start-navigation', { isMainFrame: false, isSameDocument: false });
    emit('did-start-navigation', { isMainFrame: true, isSameDocument: true });
    await jest.advanceTimersByTimeAsync(STUCK_NAVIGATION_TIMEOUT_MS);

    expect(unreachable).not.toHaveBeenCalled();
    expect(callbacks.onStuck).not.toHaveBeenCalled();
  });
});

describe('probeServer', () => {
  const guestWith = (fetch: jest.Mock) =>
    ({ session: { fetch } }) as unknown as WebContents;

  it('returns null when the server answers, without the user cookies', async () => {
    const fetch = jest.fn().mockResolvedValue({ status: 401 });

    await expect(probeServer(guestWith(fetch), SERVER_URL)).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      SERVER_URL,
      expect.objectContaining({
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'omit',
      })
    );
  });

  it.each([
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_PROXY_CONNECTION_FAILED',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_CONNECTION_TIMED_OUT',
  ])('reports %s as unreachable', async (message) => {
    const fetch = jest.fn().mockRejectedValue(new Error(message));

    await expect(probeServer(guestWith(fetch), SERVER_URL)).resolves.toBe(
      message.replace('net::', '')
    );
  });

  it('reports a probe that gets no answer as unreachable', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    const fetch = jest.fn().mockRejectedValue(timeout);

    await expect(probeServer(guestWith(fetch), SERVER_URL)).resolves.toBe(
      PROBE_TIMED_OUT
    );
  });

  it.each([
    'net::ERR_CERT_AUTHORITY_INVALID',
    'net::ERR_SSL_CLIENT_AUTH_CERT_NEEDED',
    'Redirect was cancelled',
  ])('does not treat %s as unreachable', async (message) => {
    const fetch = jest.fn().mockRejectedValue(new Error(message));

    await expect(probeServer(guestWith(fetch), SERVER_URL)).resolves.toBeNull();
  });
});

describe('nextReconnectDelay', () => {
  it('doubles with each refused probe, up to a limit', () => {
    expect(nextReconnectDelay(0)).toBe(RECONNECT_PROBE_INTERVAL_MS);
    expect(nextReconnectDelay(1)).toBe(4_000);
    expect(nextReconnectDelay(3)).toBe(16_000);
    expect(nextReconnectDelay(10)).toBe(RECONNECT_PROBE_MAX_INTERVAL_MS);
  });

  it('spreads the delay by up to a quarter either way', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(nextReconnectDelay(0)).toBe(1_500);

    jest.spyOn(Math, 'random').mockReturnValue(1);
    expect(nextReconnectDelay(0)).toBe(2_500);
  });
});

describe('waitUntilReachable', () => {
  const guest = {
    isDestroyed: jest.fn(() => false),
  } as unknown as WebContents;

  const start = (
    probe: typeof probeServer,
    backoff: ReconnectBackoff = { serverFailures: 0 },
    onReachable = jest.fn()
  ) => ({
    onReachable,
    backoff,
    stop: waitUntilReachable(
      guest,
      SERVER_URL,
      { onReachable, backoff },
      probe
    ),
  });

  it('calls back once, as soon as the server answers', async () => {
    const probe = jest
      .fn()
      .mockResolvedValueOnce('ERR_NAME_NOT_RESOLVED')
      .mockResolvedValueOnce('ERR_NAME_NOT_RESOLVED')
      .mockResolvedValue(null);
    const { onReachable } = start(probe);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 2);
    expect(onReachable).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS);
    expect(onReachable).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 5);
    expect(probe).toHaveBeenCalledTimes(3);
    expect(onReachable).toHaveBeenCalledTimes(1);
  });

  it('keeps probing every interval while the request never leaves this machine', async () => {
    const probe = jest.fn().mockResolvedValue('ERR_NAME_NOT_RESOLVED');
    start(probe);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 10);

    expect(probe).toHaveBeenCalledTimes(10);
  });

  it('keeps probing every interval when probes get no answer', async () => {
    const probe = jest.fn().mockResolvedValue(PROBE_TIMED_OUT);
    start(probe);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 10);

    expect(probe).toHaveBeenCalledTimes(10);
  });

  it('probes a refusing server less and less often', async () => {
    const probe = jest.fn().mockResolvedValue('ERR_CONNECTION_REFUSED');
    start(probe);

    await jest.advanceTimersByTimeAsync(2_000);
    expect(probe).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(4_000);
    expect(probe).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(7_999);
    expect(probe).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it('keeps the backoff when probing starts again', async () => {
    const probe = jest.fn().mockResolvedValue('ERR_CONNECTION_REFUSED');
    const backoff: ReconnectBackoff = { serverFailures: 0 };
    const first = start(probe, backoff);
    await jest.advanceTimersByTimeAsync(2_000 + 4_000 + 8_000);
    first.stop();
    expect(backoff.serverFailures).toBe(3);
    probe.mockClear();

    start(probe, backoff);
    await jest.advanceTimersByTimeAsync(16_000 - 1);
    expect(probe).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('resets the backoff when the failure is local again', async () => {
    const probe = jest
      .fn()
      .mockResolvedValueOnce('ERR_CONNECTION_REFUSED')
      .mockResolvedValue('ERR_NAME_NOT_RESOLVED');
    const backoff: ReconnectBackoff = { serverFailures: 0 };
    start(probe, backoff);

    await jest.advanceTimersByTimeAsync(2_000 + 4_000);

    expect(backoff.serverFailures).toBe(0);
  });

  it('never runs two probes at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const probe = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      inFlight -= 1;
      return PROBE_TIMED_OUT;
    });
    start(probe);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(maxInFlight).toBe(1);
  });

  it('stops probing when stopped', async () => {
    const probe = jest.fn().mockResolvedValue('ERR_NAME_NOT_RESOLVED');
    const { stop } = start(probe);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS);
    stop();
    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS * 5);

    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('ignores a probe result that arrives after it was stopped', async () => {
    let finishProbe: (value: string | null) => void = () => undefined;
    const probe = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finishProbe = resolve;
        })
    );
    const { onReachable, stop } = start(probe);

    await jest.advanceTimersByTimeAsync(RECONNECT_PROBE_INTERVAL_MS);
    stop();
    finishProbe(null);
    await jest.advanceTimersByTimeAsync(0);

    expect(onReachable).not.toHaveBeenCalled();
  });
});
