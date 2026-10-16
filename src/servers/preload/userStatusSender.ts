import type { PresenceCall } from './presenceDebounce';

type MethodError = { error?: unknown; reason?: unknown } | undefined;

// Rocket.Chat is moving client DDP methods to REST and removes the methods
// once they have no web-client caller. The desktop app is not a caller that
// the server sees, so `setUserStatus` can disappear without notice.
const isMethodNotFound = (err: MethodError): boolean =>
  String(err?.error) === '404' ||
  (typeof err?.reason === 'string' &&
    /^Method '.+' not found$/.test(err.reason));

const isExpectedRejection = (error: unknown): boolean =>
  error === 'error-not-allowed' || error === 'error-status-not-allowed';

const RATE_LIMIT_RETRY_FALLBACK_MS = 60_000;

// The server sends `X-RateLimit-Reset` as an epoch timestamp in milliseconds.
const getRateLimitRetryDelay = (response: Response): number => {
  const reset = Number(response.headers?.get?.('X-RateLimit-Reset'));
  if (!Number.isFinite(reset) || reset <= 0) {
    return RATE_LIMIT_RETRY_FALLBACK_MS;
  }
  return Math.min(
    Math.max(reset - Date.now(), 1000),
    RATE_LIMIT_RETRY_FALLBACK_MS
  );
};

export const createUserStatusSender = ({
  callMethod,
  fetchFn = (...args) => fetch(...args),
  getServerUrl,
  getCredentials,
}: {
  callMethod:
    | ((
        method: string,
        status: string,
        statusText: string | undefined,
        callback: (err: MethodError) => void
      ) => void)
    | undefined;
  fetchFn?: typeof fetch;
  getServerUrl: () => string;
  getCredentials: () => { userId: string; authToken: string } | null;
}): ((call: PresenceCall) => void) => {
  let useRest = !callMethod;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  // `expectedUserId` drops a late send when the webview user changed after
  // the status was requested.
  const sendOverRest = async (call: PresenceCall, expectedUserId?: string) => {
    const { status, statusText } = call;
    const credentials = getCredentials();
    if (!credentials) return;
    if (expectedUserId !== undefined && credentials.userId !== expectedUserId) {
      return;
    }

    try {
      const response = await fetchFn(
        new URL('api/v1/users.setStatus', getServerUrl()).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': credentials.userId,
            'X-Auth-Token': credentials.authToken,
          },
          body: JSON.stringify({
            status,
            ...(statusText !== undefined && { message: statusText }),
          }),
        }
      );
      if (response.ok) return;

      if (response.status === 429) {
        const delay = getRateLimitRetryDelay(response);
        console.warn(
          `[Rocket.Chat Desktop] users.setStatus rate limited; retrying in ${Math.ceil(
            delay / 1000
          )}s`
        );
        retryTimer = setTimeout(() => {
          retryTimer = undefined;
          void sendOverRest(call, credentials.userId);
        }, delay);
        return;
      }

      const body = await response.json().catch(() => ({}));
      const error = body?.errorType ?? body?.error;
      if (isExpectedRejection(error)) {
        console.warn(
          `[Rocket.Chat Desktop] users.setStatus rejected: ${error}`
        );
        return;
      }
      console.error(
        '[Rocket.Chat Desktop] users.setStatus failed',
        response.status,
        body
      );
    } catch (error) {
      console.error('[Rocket.Chat Desktop] users.setStatus failed', error);
    }
  };

  return (call) => {
    // A newer status replaces one that waits for the rate limit to reset.
    clearTimeout(retryTimer);
    retryTimer = undefined;

    if (useRest || !callMethod) {
      void sendOverRest(call);
      return;
    }

    const requestingUserId = getCredentials()?.userId;

    callMethod('setUserStatus', call.status, call.statusText, (err) => {
      if (!err) return;

      if (isMethodNotFound(err)) {
        console.warn(
          '[Rocket.Chat Desktop] setUserStatus method not found; using users.setStatus from now on'
        );
        useRest = true;
        if (requestingUserId !== undefined) {
          void sendOverRest(call, requestingUserId);
        }
        return;
      }

      if (isExpectedRejection(err.error)) {
        console.warn(
          `[Rocket.Chat Desktop] setUserStatus rejected: ${err.error}`
        );
        return;
      }

      console.error('[Rocket.Chat Desktop] setUserStatus failed', err);
    });
  };
};
