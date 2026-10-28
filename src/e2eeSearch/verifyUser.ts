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

type FetchServerPublicKeyDeps = VerifyUserDeps & {
  // The waits before each new question while the server holds no key.
  noKeyRetryDelaysMs?: readonly number[];
};

// After a key reset, the web client opens the index as soon as it loads its
// new keys, and uploads the new public key a moment later. These waits let
// the open read that key, so it can store its fingerprint.
export const NO_KEY_RETRY_DELAYS_MS: readonly number[] = [250, 500, 1000, 2000];

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

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

// The E2EE public key that the server
// holds for the user of the page's login token, so main never trusts a key
// that the page sends. `e2e.fetchMyPublicKey` returns only that public key.
// A server older than that route answers 404, and only then this function
// asks `e2e.fetchMyKeys`, whose answer also holds the private key, encrypted
// by the user's E2EE password. From either answer, only the public key field
// is read and leaves this function. No part of an answer is logged or kept.
// Null when the server holds no key for the user (a key reset removes it).
// Throws when the server cannot tell the key: no token, a refused token,
// network, timeout, any failure other than a 404 of the public key route,
// or an answer of another shape.
const fetchServerPublicKeyOnce = async (
  deps: VerifyUserDeps,
  serverUrl: string,
  userId: string
): Promise<string | null> => {
  const timeoutMs = deps.timeoutMs ?? VERIFY_USER_TIMEOUT_MS;
  const token = await withTimeout(deps.readLoginToken(), timeoutMs);
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('E2EE search key check has no login token');
  }

  const request = (route: string) =>
    withTimeout(
      deps.fetch(new URL(`api/v1/${route}`, serverUrl).href, {
        method: 'GET',
        headers: { 'X-User-Id': userId, 'X-Auth-Token': token },
        credentials: 'omit',
        redirect: 'error',
      }),
      timeoutMs
    );

  let response = await request('e2e.fetchMyPublicKey');
  if (response.status === 404) {
    response = await request('e2e.fetchMyKeys');
  }
  if (!response.ok) {
    throw new Error(`E2EE search key check failed: HTTP ${response.status}`);
  }
  const body = (await withTimeout(response.json(), timeoutMs)) as {
    public_key?: unknown;
  } | null;
  if (typeof body !== 'object' || body === null) {
    throw new Error('E2EE search key check got no public key');
  }
  const publicKey = body.public_key;
  if (publicKey === undefined) return null;
  if (typeof publicKey !== 'string') {
    throw new Error('E2EE search key check got no public key');
  }
  return publicKey;
};

// While the server holds no key, it asks again after each wait of
// `noKeyRetryDelaysMs` (none by default), and returns null only after the
// last one.
export const fetchServerPublicKey = async (
  deps: FetchServerPublicKeyDeps,
  serverUrl: string,
  userId: string
): Promise<string | null> => {
  let publicKey = await fetchServerPublicKeyOnce(deps, serverUrl, userId);
  for (const delayMs of deps.noKeyRetryDelaysMs ?? []) {
    if (publicKey !== null) break;
    // eslint-disable-next-line no-await-in-loop -- each question waits for the one before it
    await wait(delayMs);
    // eslint-disable-next-line no-await-in-loop -- each question waits for the one before it
    publicKey = await fetchServerPublicKeyOnce(deps, serverUrl, userId);
  }
  return publicKey;
};
