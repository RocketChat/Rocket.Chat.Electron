import { fetchServerPublicKey, verifyServerUserId } from '../verifyUser';

const SERVER = 'https://chat.example.com/sub/';

const json = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as Response;

describe('verifyServerUserId', () => {
  it('asks the server with the page token and the claimed user id', async () => {
    const calls: Array<[string, RequestInit]> = [];
    const owned = await verifyServerUserId(
      {
        readLoginToken: async () => 'tokenB',
        fetch: async (url, init) => {
          calls.push([url, init]);
          return json(200, { _id: 'userB' });
        },
      },
      SERVER,
      'userB'
    );

    expect(owned).toBe(true);
    expect(calls[0][0]).toBe('https://chat.example.com/sub/api/v1/me');
    expect(calls[0][1].headers).toEqual({
      'X-User-Id': 'userB',
      'X-Auth-Token': 'tokenB',
    });
  });

  it('refuses a user id that the token does not belong to', async () => {
    const fetch = async () => json(401, { status: 'error' });
    await expect(
      verifyServerUserId(
        { readLoginToken: async () => 'tokenB', fetch },
        SERVER,
        'userA'
      )
    ).resolves.toBe(false);
  });

  it('refuses an answer for another user and a page with no token', async () => {
    await expect(
      verifyServerUserId(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, { _id: 'userB' }),
        },
        SERVER,
        'userA'
      )
    ).resolves.toBe(false);

    const fetch = jest.fn();
    await expect(
      verifyServerUserId(
        { readLoginToken: async () => null, fetch },
        SERVER,
        'userA'
      )
    ).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws when the server cannot answer or the page does not answer', async () => {
    await expect(
      verifyServerUserId(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(502, {}),
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('HTTP 502');

    await expect(
      verifyServerUserId(
        {
          readLoginToken: () => new Promise(() => undefined),
          fetch: async () => json(200, { _id: 'userB' }),
          timeoutMs: 10,
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('timed out');
  });
});

// The E2EE public key of the user, from
// the server, on the page's login session. `e2e.fetchMyPublicKey` returns
// only the own public key. An older server without it answers 404, and then
// the function asks `e2e.fetchMyKeys`, which also returns the private key
// encrypted by the user's E2EE password. Only the public key leaves the
// function.
describe('fetchServerPublicKey', () => {
  const PUBLIC_KEY = '{"kty":"RSA","n":"abc","e":"AQAB"}';
  const PUBLIC_KEY_URL =
    'https://chat.example.com/sub/api/v1/e2e.fetchMyPublicKey';
  const ALL_KEYS_URL = 'https://chat.example.com/sub/api/v1/e2e.fetchMyKeys';
  const REQUEST = {
    method: 'GET',
    headers: { 'X-User-Id': 'userB', 'X-Auth-Token': 'tokenB' },
    credentials: 'omit',
    redirect: 'error',
  };

  // A server that knows only the routes in `answers`, and answers 404 to
  // any other route.
  const server = (answers: Record<string, () => Response>) => {
    const calls: Array<[string, RequestInit]> = [];
    const fetch = async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return answers[url]?.() ?? json(404, { success: false });
    };
    return { calls, fetch };
  };

  // An answer body that records each read of a private key field.
  const bodyWithPrivateKey = (reads: string[]) => {
    const body = { public_key: PUBLIC_KEY, success: true };
    for (const field of ['private_key', 'e2e']) {
      Object.defineProperty(body, field, {
        enumerable: true,
        get: () => {
          reads.push(field);
          return '{"$binary":"encrypted"}';
        },
      });
    }
    return body;
  };

  it('asks the public key route with the page token and returns the public key', async () => {
    const { calls, fetch } = server({
      [PUBLIC_KEY_URL]: () =>
        json(200, { public_key: PUBLIC_KEY, success: true }),
    });

    const publicKey = await fetchServerPublicKey(
      { readLoginToken: async () => 'tokenB', fetch },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(PUBLIC_KEY_URL);
    expect(calls[0][1]).toMatchObject(REQUEST);
  });

  it('reads no private key field from the public key route, even when the server sends one', async () => {
    const reads: string[] = [];
    const { calls, fetch } = server({
      [PUBLIC_KEY_URL]: () => json(200, bodyWithPrivateKey(reads)),
    });

    const publicKey = await fetchServerPublicKey(
      { readLoginToken: async () => 'tokenB', fetch },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL]);
    expect(reads).toEqual([]);
  });

  it('falls back to e2e.fetchMyKeys when the server has no public key route (404)', async () => {
    const reads: string[] = [];
    const { calls, fetch } = server({
      [ALL_KEYS_URL]: () => json(200, bodyWithPrivateKey(reads)),
    });

    const publicKey = await fetchServerPublicKey(
      { readLoginToken: async () => 'tokenB', fetch },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL, ALL_KEYS_URL]);
    expect(calls[1][1]).toMatchObject(REQUEST);
    expect(reads).toEqual([]);
  });

  it('returns null from the fallback when the older server holds no key', async () => {
    const { calls, fetch } = server({
      [ALL_KEYS_URL]: () => json(200, { success: true }),
    });

    await expect(
      fetchServerPublicKey(
        { readLoginToken: async () => 'tokenB', fetch },
        SERVER,
        'userB'
      )
    ).resolves.toBeNull();
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL, ALL_KEYS_URL]);
  });

  it.each([401, 403, 500, 502])(
    'does not fall back on HTTP %i from the public key route, and throws',
    async (status) => {
      const { calls, fetch } = server({
        [PUBLIC_KEY_URL]: () => json(status, { success: false }),
        [ALL_KEYS_URL]: () =>
          json(200, { public_key: PUBLIC_KEY, success: true }),
      });

      await expect(
        fetchServerPublicKey(
          { readLoginToken: async () => 'tokenB', fetch },
          SERVER,
          'userB'
        )
      ).rejects.toThrow(`HTTP ${status}`);
      expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL]);
    }
  );

  it('throws when the fallback route also fails', async () => {
    const { calls, fetch } = server({});

    await expect(
      fetchServerPublicKey(
        { readLoginToken: async () => 'tokenB', fetch },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('HTTP 404');
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL, ALL_KEYS_URL]);
  });

  it('returns null when the server holds no key for the user', async () => {
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, { success: true }),
        },
        SERVER,
        'userB'
      )
    ).resolves.toBeNull();
  });

  // Live, after a key reset: the web client opens the index when its new
  // keys are loaded, and uploads the new public key a moment later. The
  // first answer then holds no key, and the open stored no fingerprint.
  it('asks again while the server holds no key, and returns the key that the page uploads meanwhile', async () => {
    let answers = 0;
    const fetch = jest.fn(async () => {
      answers++;
      return answers < 3
        ? json(200, { success: true })
        : json(200, { public_key: PUBLIC_KEY, success: true });
    });

    const publicKey = await fetchServerPublicKey(
      {
        readLoginToken: async () => 'tokenB',
        fetch,
        noKeyRetryDelaysMs: [1, 1, 1],
      },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('returns null when the server still holds no key after the last retry', async () => {
    const fetch = jest.fn(async () => json(200, { success: true }));

    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch,
          noKeyRetryDelaysMs: [1, 1],
        },
        SERVER,
        'userB'
      )
    ).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not ask again after an answer that cannot tell the key', async () => {
    const fetch = jest.fn(async () => json(502, {}));

    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch,
          noKeyRetryDelaysMs: [1, 1],
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('HTTP 502');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws when the server, the token or the answer cannot tell the key', async () => {
    const withAnswer = (status: number, body: unknown) =>
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(status, body),
        },
        SERVER,
        'userB'
      );

    await expect(withAnswer(401, { status: 'error' })).rejects.toThrow(
      'HTTP 401'
    );
    await expect(withAnswer(502, {})).rejects.toThrow('HTTP 502');
    await expect(withAnswer(200, { public_key: 42 })).rejects.toThrow(
      'no public key'
    );
    await expect(withAnswer(200, null)).rejects.toThrow('no public key');

    const fetch = jest.fn();
    await expect(
      fetchServerPublicKey(
        { readLoginToken: async () => null, fetch },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('no login token');
    expect(fetch).not.toHaveBeenCalled();

    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: () => new Promise(() => undefined),
          timeoutMs: 10,
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('timed out');
  });
});
