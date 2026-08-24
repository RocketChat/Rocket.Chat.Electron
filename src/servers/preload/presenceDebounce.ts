// The server rate-limits Meteor.call('setUserStatus', ...) to 1 call per
// second per user. A request arriving within that window of the previous one
// is deferred (trailing-edge) rather than dropped, so the last requested
// status still eventually reaches the server once the window elapses.
export const shouldDebouncePresenceCall = (
  now: number,
  lastCallAt: number,
  minIntervalMs: number
): boolean => now - lastCallAt < minIntervalMs;

export type PresenceCall = {
  status: string;
  statusText?: string;
};

export const createPresenceRateLimiter = (options: {
  minIntervalMs: number;
  send: (call: PresenceCall) => void;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => void;
  onDeferred?: (call: PresenceCall) => void;
}): { request: (call: PresenceCall) => void } => {
  const {
    minIntervalMs,
    send,
    now = () => Date.now(),
    schedule = (fn: () => void, ms: number) => setTimeout(fn, ms),
    onDeferred,
  } = options;

  let lastCallAt = 0;
  let hasSentFirstCall = false;
  let pendingCall: PresenceCall | null = null;
  let timerScheduled = false;

  const flush = (): void => {
    timerScheduled = false;

    if (!pendingCall) return;

    const call = pendingCall;
    pendingCall = null;
    lastCallAt = now();
    hasSentFirstCall = true;
    send(call);
  };

  const request = (call: PresenceCall): void => {
    const currentTime = now();

    if (timerScheduled) {
      pendingCall = call;
      onDeferred?.(call);
      return;
    }

    if (
      hasSentFirstCall &&
      shouldDebouncePresenceCall(currentTime, lastCallAt, minIntervalMs)
    ) {
      pendingCall = call;
      onDeferred?.(call);

      if (!timerScheduled) {
        timerScheduled = true;
        const remainingMs = minIntervalMs - (currentTime - lastCallAt);
        schedule(flush, remainingMs);
      }

      return;
    }

    lastCallAt = currentTime;
    hasSentFirstCall = true;
    send(call);
  };

  return { request };
};
