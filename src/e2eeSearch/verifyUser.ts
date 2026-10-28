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

// The answers of the user and key routes are small. A larger
// body is refused before it is parsed, so a hostile server cannot stream an
// endless body into the main process.
export const MAX_SERVER_ANSWER_BYTES = 64 * 1024;

class ServerAnswerTooLargeError extends Error {
  constructor() {
    super('E2EE search server answer is too large');
  }
}

// `new URL('api/v1/me', 'https://host/sub')` drops `sub`, so a server URL
// without a trailing slash gets one, like the server views do (uiOverride).
const withTrailingSlash = (url: string) =>
  url.endsWith('/') ? url : `${url}/`;

const readCappedJson = async (response: Response): Promise<unknown> => {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_SERVER_ANSWER_BYTES) throw new ServerAnswerTooLargeError();
  const reader = response.body?.getReader();
  if (!reader) throw new Error('E2EE search server answer has no body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- each chunk follows the one before it
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SERVER_ANSWER_BYTES) {
      void reader.cancel().catch(() => undefined);
      throw new ServerAnswerTooLargeError();
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

type ServerAnswer = { status: number; ok: boolean; body?: unknown };

// One GET of an API route on the page's login session. The timeout covers
// the request and the body, and it aborts both. The body is
// read only from a 2xx answer.
const askServer = async (
  deps: VerifyUserDeps,
  serverUrl: string,
  route: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<ServerAnswer> => {
  const controller = new AbortController();
  try {
    return await withTimeout(
      (async () => {
        const response = await deps.fetch(
          new URL(`api/v1/${route}`, withTrailingSlash(serverUrl)).href,
          {
            method: 'GET',
            headers,
            credentials: 'omit',
            redirect: 'error',
            signal: controller.signal,
          }
        );
        if (!response.ok) return { status: response.status, ok: false };
        return {
          status: response.status,
          ok: true,
          body: await readCappedJson(response),
        };
      })(),
      timeoutMs
    );
  } finally {
    // Ends a request or a body that is still open: late, too large or not
    // read.
    controller.abort();
  }
};

// True when the server says that the page's login token belongs to
// `userId`. False when the page has no token or the server refuses it.
// Throws when the server cannot answer (network, timeout, 5xx, a body that
// is too large or not JSON).
export const verifyServerUserId = async (
  deps: VerifyUserDeps,
  serverUrl: string,
  userId: string
): Promise<boolean> => {
  const timeoutMs = deps.timeoutMs ?? VERIFY_USER_TIMEOUT_MS;
  const token = await withTimeout(deps.readLoginToken(), timeoutMs);
  if (typeof token !== 'string' || token.length === 0) return false;

  const answer = await askServer(
    deps,
    serverUrl,
    'me',
    { 'X-User-Id': userId, 'X-Auth-Token': token },
    timeoutMs
  );
  if (answer.status === 401 || answer.status === 403) return false;
  if (!answer.ok) {
    throw new Error(`E2EE search user check failed: HTTP ${answer.status}`);
  }
  const body = answer.body as { _id?: unknown } | null;
  return body?._id === userId;
};

// The E2EE public key that the server
// holds for the user of the page's login token, so main never trusts a key
// that the page sends. `e2e.fetchMyPublicKey` returns only that public key.
// A server older than that route answers 404, and only then this function
// asks `e2e.fetchMyKeys`, whose answer also holds the private key, encrypted
// by the user's E2EE password. From either answer, only the public key field
// is read and leaves this function. No part of an answer is logged or kept.
// An open deletes the index only on an explicit answer, so:
// - a string: the key, from an answer with `success: true`;
// - null: the answer has `success: true` and `public_key: null`;
// - undefined: unknown. The answer has `success: true` and no `public_key`
//   field. Both routes send that answer today when the user has no key.
// Throws when the server cannot tell the key: no token, a refused token,
// network, timeout, any failure other than a 404 of the public key route,
// no `success: true`, a body that is too large or not JSON, or an answer of
// another shape.
const fetchServerPublicKeyOnce = async (
  deps: VerifyUserDeps,
  serverUrl: string,
  userId: string
): Promise<string | null | undefined> => {
  const timeoutMs = deps.timeoutMs ?? VERIFY_USER_TIMEOUT_MS;
  const token = await withTimeout(deps.readLoginToken(), timeoutMs);
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('E2EE search key check has no login token');
  }

  const request = (route: string) =>
    askServer(
      deps,
      serverUrl,
      route,
      { 'X-User-Id': userId, 'X-Auth-Token': token },
      timeoutMs
    );

  let answer = await request('e2e.fetchMyPublicKey');
  if (answer.status === 404) {
    answer = await request('e2e.fetchMyKeys');
  }
  if (!answer.ok) {
    throw new Error(`E2EE search key check failed: HTTP ${answer.status}`);
  }
  const body = answer.body as {
    public_key?: unknown;
    success?: unknown;
  } | null;
  if (typeof body !== 'object' || body === null || body.success !== true) {
    throw new Error('E2EE search key check got no public key');
  }
  const publicKey = body.public_key;
  if (publicKey === undefined || publicKey === null) return publicKey;
  if (typeof publicKey !== 'string') {
    throw new Error('E2EE search key check got no public key');
  }
  return publicKey;
};

// While the server names no key (null or undefined), it asks again after
// each wait of `noKeyRetryDelaysMs` (none by default), and returns the last
// answer only after the last wait.
export const fetchServerPublicKey = async (
  deps: FetchServerPublicKeyDeps,
  serverUrl: string,
  userId: string
): Promise<string | null | undefined> => {
  let publicKey = await fetchServerPublicKeyOnce(deps, serverUrl, userId);
  for (const delayMs of deps.noKeyRetryDelaysMs ?? []) {
    if (typeof publicKey === 'string') break;
    // eslint-disable-next-line no-await-in-loop -- each question waits for the one before it
    await wait(delayMs);
    // eslint-disable-next-line no-await-in-loop -- each question waits for the one before it
    publicKey = await fetchServerPublicKeyOnce(deps, serverUrl, userId);
  }
  return publicKey;
};
