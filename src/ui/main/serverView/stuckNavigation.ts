import type { Event, WebContents } from 'electron';

export const REACHABILITY_PROBE_DELAY_MS = 3_000;
export const REACHABILITY_PROBE_TIMEOUT_MS = 10_000;
export const HELD_NAVIGATION_RETRY_MS = 8_000;
export const STUCK_NAVIGATION_TIMEOUT_MS = 30_000;
export const RECONNECT_PROBE_INTERVAL_MS = 2_000;
export const RECONNECT_PROBE_MAX_INTERVAL_MS = 30_000;

// The request never leaves this machine, so probing again costs the server
// nothing.
const LOCAL_ERRORS = new Set([
  'ERR_ADDRESS_UNREACHABLE',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_NAME_RESOLUTION_FAILED',
  'ERR_NETWORK_CHANGED',
  'ERR_PROXY_CONNECTION_FAILED',
]);

// The server's host or the path to it answered with a refusal, so the server
// is likely down or restarting.
const SERVER_ERRORS = new Set([
  'ERR_CONNECTION_CLOSED',
  'ERR_CONNECTION_FAILED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_TUNNEL_CONNECTION_FAILED',
]);

const TIMEOUT_ERRORS = new Set(['ERR_CONNECTION_TIMED_OUT', 'ERR_TIMED_OUT']);

export const PROBE_TIMED_OUT = 'PROBE_TIMED_OUT';

export const isUnreachableError = (code: string): boolean =>
  LOCAL_ERRORS.has(code) || SERVER_ERRORS.has(code) || TIMEOUT_ERRORS.has(code);

// Resolves to the reason the server cannot be reached, or null when it
// answered. Errors that are not about the network (certificates, for one) are
// left to the page itself. The probe does not send the user's cookies.
export const probeServer = async (
  webContents: WebContents,
  serverUrl: string
): Promise<string | null> => {
  try {
    await webContents.session.fetch(serverUrl, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(REACHABILITY_PROBE_TIMEOUT_MS),
    });
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return PROBE_TIMED_OUT;
    }
    const code =
      error instanceof Error ? error.message.replace(/^net::/, '') : '';
    return isUnreachableError(code) ? code : null;
  }
};

const withJitter = (delay: number): number =>
  Math.round(delay * (0.75 + Math.random() * 0.5));

type StuckNavigationCallbacks = {
  // The navigation will not complete by itself: show the failure view.
  onStuck: (reason: string, isUnreachable: boolean) => void;
  // The server answers but the navigation is still held: load it again.
  onHeld: () => void;
  // A navigation reported as stuck committed after all.
  onRecovered: () => void;
};

// A server's service worker can hold a navigation open without ever answering
// it, as happens when the app starts without a network or before a VPN is up,
// and it keeps holding it after the network returns. Electron then reports
// neither a failure nor a finished load, so the view stays blank and nothing
// retries.
//
// For a main-frame navigation still waiting for its response:
// - an unreachable server is reported as stuck at once; a probe that gets no
//   answer counts only the second time, so a slow link is not taken for a
//   dead one;
// - a server that answers while the navigation is still held is loaded again,
//   once, so a slow server is not restarted in a loop;
// - anything still waiting at the timeout is reported as stuck;
// - a stuck navigation that commits after all is reported as recovered.
export const watchStuckNavigation = (
  webContents: WebContents,
  serverUrl: string,
  { onStuck, onHeld, onRecovered }: StuckNavigationCallbacks,
  probe: typeof probeServer = probeServer
): void => {
  let navigation = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];
  let hasRetriedHeldNavigation = false;
  let isReportedStuck = false;

  const isWaiting = (): boolean =>
    !webContents.isDestroyed() &&
    webContents.isLoading() &&
    webContents.isWaitingForResponse();

  const clear = (): void => {
    navigation += 1;
    timers.forEach(clearTimeout);
    timers = [];
  };

  const isCurrent = (current: number): boolean =>
    current === navigation && isWaiting();

  const report = (
    current: number,
    reason: string,
    isUnreachable: boolean
  ): void => {
    if (!isCurrent(current)) {
      return;
    }
    clear();
    isReportedStuck = true;
    onStuck(reason, isUnreachable);
  };

  const check = async (
    current: number,
    isLastProbe: boolean
  ): Promise<void> => {
    if (!isCurrent(current)) {
      return;
    }
    const unreachable = await probe(webContents, serverUrl);
    if (!isCurrent(current)) {
      return;
    }
    if (unreachable === PROBE_TIMED_OUT && !isLastProbe) {
      return;
    }
    if (unreachable) {
      report(current, `server unreachable (${unreachable})`, true);
      return;
    }
    if (isLastProbe && !hasRetriedHeldNavigation) {
      hasRetriedHeldNavigation = true;
      clear();
      onHeld();
    }
  };

  const arm = (): void => {
    clear();
    isReportedStuck = false;
    const current = navigation;

    timers.push(
      setTimeout(() => check(current, false), REACHABILITY_PROBE_DELAY_MS),
      setTimeout(() => check(current, true), HELD_NAVIGATION_RETRY_MS),
      setTimeout(
        () =>
          report(
            current,
            `no response in ${STUCK_NAVIGATION_TIMEOUT_MS / 1000} s`,
            false
          ),
        STUCK_NAVIGATION_TIMEOUT_MS
      )
    );
  };

  webContents.addListener(
    'did-start-navigation',
    (details: Event<{ isMainFrame: boolean; isSameDocument: boolean }>) => {
      if (details.isMainFrame && !details.isSameDocument) {
        arm();
      }
    }
  );
  // Electron does not emit did-navigate for error pages, only for a page
  // that actually committed.
  webContents.addListener('did-navigate', () => {
    hasRetriedHeldNavigation = false;
    clear();
    if (isReportedStuck) {
      isReportedStuck = false;
      onRecovered();
    }
  });
  webContents.addListener('did-stop-loading', clear);
  webContents.addListener('destroyed', clear);

  // The first navigation starts before the server view is announced to the
  // main process, so its start event has already been missed.
  if (webContents.isLoading()) {
    arm();
  }
};

export type ReconnectBackoff = {
  // Probes in a row that the server refused. It survives the failure view's
  // own reloads and is reset only once a page loads.
  serverFailures: number;
};

export const nextReconnectDelay = (serverFailures: number): number =>
  withJitter(
    Math.min(
      RECONNECT_PROBE_INTERVAL_MS * 2 ** serverFailures,
      RECONNECT_PROBE_MAX_INTERVAL_MS
    )
  );

// Probes the server until it answers, then calls onReachable once. A server
// that refuses connections is probed less and less often, so many clients do
// not hammer it while it restarts. The returned function stops the probing.
export const waitUntilReachable = (
  webContents: WebContents,
  serverUrl: string,
  {
    onReachable,
    backoff,
  }: { onReachable: () => void; backoff: ReconnectBackoff },
  probe: typeof probeServer = probeServer
): (() => void) => {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = async (): Promise<void> => {
    if (stopped || webContents.isDestroyed()) {
      return;
    }
    const unreachable = await probe(webContents, serverUrl);
    if (stopped || webContents.isDestroyed()) {
      return;
    }
    if (unreachable) {
      backoff.serverFailures = SERVER_ERRORS.has(unreachable)
        ? backoff.serverFailures + 1
        : 0;
      timer = setTimeout(check, nextReconnectDelay(backoff.serverFailures));
      return;
    }
    stopped = true;
    onReachable();
  };

  timer = setTimeout(check, nextReconnectDelay(backoff.serverFailures));

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
};
