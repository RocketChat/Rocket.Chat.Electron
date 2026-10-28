import {
  fetchServerPublicKey,
  MAX_SERVER_ANSWER_BYTES,
  verifyServerUserId,
} from '../verifyUser';

const SERVER = 'https://chat.example.com/sub/';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

// A body that the server sends in chunks and never ends.
const endlessBody = (chunk: string) => {
  const bytes = new TextEncoder().encode(chunk);
  let cancelled = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull: (controller) => {
        controller.enqueue(bytes);
      },
      cancel: () => {
        cancelled = true;
      },
    }),
    { status: 200 }
  );
  return { response, isCancelled: () => cancelled };
};

// A fetch that never answers, and records whether the caller aborted it.
const hangingFetch = () => {
  const signals: AbortSignal[] = [];
  const fetch = (_url: string, init: RequestInit) => {
    if (init.signal) signals.push(init.signal);
    return new Promise<Response>(() => undefined);
  };
  return { fetch, signals };
};

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

  // An answer that also holds the private key, like `e2e.fetchMyKeys`.
  const bodyWithPrivateKey = () => ({
    public_key: PUBLIC_KEY,
    private_key: '{"$binary":"encrypted"}',
    success: true,
  });

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

  it('returns no private key field from the public key route, even when the server sends one', async () => {
    const { calls, fetch } = server({
      [PUBLIC_KEY_URL]: () => json(200, bodyWithPrivateKey()),
    });

    const publicKey = await fetchServerPublicKey(
      { readLoginToken: async () => 'tokenB', fetch },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL]);
  });

  it('falls back to e2e.fetchMyKeys when the server has no public key route (404)', async () => {
    const { calls, fetch } = server({
      [ALL_KEYS_URL]: () => json(200, bodyWithPrivateKey()),
    });

    const publicKey = await fetchServerPublicKey(
      { readLoginToken: async () => 'tokenB', fetch },
      SERVER,
      'userB'
    );

    expect(publicKey).toBe(PUBLIC_KEY);
    expect(calls.map(([url]) => url)).toEqual([PUBLIC_KEY_URL, ALL_KEYS_URL]);
    expect(calls[1][1]).toMatchObject(REQUEST);
  });

  // The server names no key, so the open deletes nothing.
  it('returns unknown from the fallback when the older server names no key', async () => {
    const { calls, fetch } = server({
      [ALL_KEYS_URL]: () => json(200, { success: true }),
    });

    await expect(
      fetchServerPublicKey(
        { readLoginToken: async () => 'tokenB', fetch },
        SERVER,
        'userB'
      )
    ).resolves.toBeUndefined();
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

  it('returns null only when the server says that it holds no key', async () => {
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, { public_key: null, success: true }),
        },
        SERVER,
        'userB'
      )
    ).resolves.toBeNull();
  });

  // A hostile server must not make the open delete the index
  // with an answer that does not say "no key".
  it('returns unknown, not null, for an answer without public_key', async () => {
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, { success: true }),
        },
        SERVER,
        'userB'
      )
    ).resolves.toBeUndefined();
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, {}),
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('no public key');
  });

  it.each([
    ['success false', { public_key: null, success: false }],
    ['no success field', { public_key: null }],
    ['a key without success', { public_key: PUBLIC_KEY }],
  ])('throws, and returns no null, for an answer with %s', async (_, body) => {
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => json(200, body),
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow('no public key');
  });

  it('throws for a body that is not JSON', async () => {
    await expect(
      fetchServerPublicKey(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => new Response('<html>', { status: 200 }),
        },
        SERVER,
        'userB'
      )
    ).rejects.toThrow();
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
    const fetch = jest.fn(async () =>
      json(200, { public_key: null, success: true })
    );

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

// A hostile or broken server must not keep a request open, and
// must not stream an endless body into the main process.
describe('the requests to the server', () => {
  const PUBLIC_KEY = '{"kty":"RSA","n":"abc","e":"AQAB"}';
  const checks = {
    verifyServerUserId: (deps: Parameters<typeof verifyServerUserId>[0]) =>
      verifyServerUserId(deps, SERVER, 'userB'),
    fetchServerPublicKey: (deps: Parameters<typeof verifyServerUserId>[0]) =>
      fetchServerPublicKey(deps, SERVER, 'userB'),
  };

  it.each(Object.entries(checks))(
    '%s aborts the request when the server does not answer in time',
    async (_, check) => {
      const { fetch, signals } = hangingFetch();

      await expect(
        check({ readLoginToken: async () => 'tokenB', fetch, timeoutMs: 10 })
      ).rejects.toThrow('timed out');
      expect(signals).toHaveLength(1);
      expect(signals[0].aborted).toBe(true);
    }
  );

  it.each(Object.entries(checks))(
    '%s stops reading a body that is larger than the cap',
    async (_, check) => {
      const { response, isCancelled } = endlessBody(' '.repeat(4096));

      await expect(
        check({
          readLoginToken: async () => 'tokenB',
          fetch: async () => response,
          timeoutMs: 5_000,
        })
      ).rejects.toThrow('too large');
      expect(isCancelled()).toBe(true);
    }
  );

  it.each(Object.entries(checks))(
    '%s refuses a complete JSON body that is larger than the cap',
    async (_, check) => {
      const padding = ' '.repeat(MAX_SERVER_ANSWER_BYTES);
      const body = `{"_id":"userB","public_key":${JSON.stringify(PUBLIC_KEY)},"success":true}${padding}`;

      await expect(
        check({
          readLoginToken: async () => 'tokenB',
          fetch: async () => new Response(body, { status: 200 }),
        })
      ).rejects.toThrow('too large');
    }
  );

  it('accepts an answer up to the cap', async () => {
    const body = JSON.stringify({ _id: 'userB' });
    const padded = body + ' '.repeat(MAX_SERVER_ANSWER_BYTES - body.length);

    await expect(
      verifyServerUserId(
        {
          readLoginToken: async () => 'tokenB',
          fetch: async () => new Response(padded, { status: 200 }),
        },
        SERVER,
        'userB'
      )
    ).resolves.toBe(true);
  });

  it('keeps the path of a server URL without a trailing slash', async () => {
    const urls: string[] = [];
    const fetch = async (url: string) => {
      urls.push(url);
      return url.endsWith('/me')
        ? json(200, { _id: 'userB' })
        : json(200, { public_key: PUBLIC_KEY, success: true });
    };
    const deps = { readLoginToken: async () => 'tokenB', fetch };

    await verifyServerUserId(deps, 'https://chat.example.com/sub', 'userB');
    await fetchServerPublicKey(deps, 'https://chat.example.com/sub', 'userB');

    expect(urls).toEqual([
      'https://chat.example.com/sub/api/v1/me',
      'https://chat.example.com/sub/api/v1/e2e.fetchMyPublicKey',
    ]);
  });
});
