// Main asks the server who owns the login session of the webview,
// instead of trusting the user id that the page sends. A script on the page
// can change what it reads from its own storage, but the server accepts a
// login token only for the user that owns it.

// The expression that reads the login token in the page. Meteor keeps it in
// `Meteor._localStorage`, which is the page's `localStorage` in a browser.
export const READ_LOGIN_TOKEN_SCRIPT =
  "(window.Meteor?._localStorage ?? window.localStorage)?.getItem('Meteor.loginToken') ?? null";

export const VERIFY_USER_TIMEOUT_MS = 10_000;

type VerifyUserDeps = {
  readLoginToken(): Promise<unknown>;
  fetch(url: string, init: RequestInit): Promise<Response>;
  timeoutMs?: number;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('E2EE search user check timed out')),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// True when the server says that the page's login token belongs to
// `userId`. False when the page has no token or the server refuses it.
// Throws when the server cannot answer (network, timeout, 5xx).
export const verifyServerUserId = async (
  deps: VerifyUserDeps,
  serverUrl: string,
  userId: string
): Promise<boolean> => {
  const timeoutMs = deps.timeoutMs ?? VERIFY_USER_TIMEOUT_MS;
  const token = await withTimeout(deps.readLoginToken(), timeoutMs);
  if (typeof token !== 'string' || token.length === 0) return false;

  const response = await withTimeout(
    deps.fetch(new URL('api/v1/me', serverUrl).href, {
      method: 'GET',
      headers: { 'X-User-Id': userId, 'X-Auth-Token': token },
      credentials: 'omit',
      redirect: 'error',
    }),
    timeoutMs
  );
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) {
    throw new Error(`E2EE search user check failed: HTTP ${response.status}`);
  }
  const body = (await withTimeout(response.json(), timeoutMs)) as {
    _id?: unknown;
  };
  return body?._id === userId;
};
