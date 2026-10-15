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

  const sendOverRest = async ({ status, statusText }: PresenceCall) => {
    const credentials = getCredentials();
    if (!credentials) return;

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

      const body = await response.json().catch(() => ({}));
      const error = body?.errorType ?? body?.error;
      if (isExpectedRejection(error) || response.status === 429) {
        console.warn(
          `[Rocket.Chat Desktop] users.setStatus rejected: ${
            response.status === 429 ? 'rate limited' : error
          }`
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
    if (useRest || !callMethod) {
      void sendOverRest(call);
      return;
    }

    callMethod('setUserStatus', call.status, call.statusText, (err) => {
      if (!err) return;

      if (isMethodNotFound(err)) {
        console.warn(
          '[Rocket.Chat Desktop] setUserStatus method not found; using users.setStatus from now on'
        );
        useRest = true;
        void sendOverRest(call);
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
