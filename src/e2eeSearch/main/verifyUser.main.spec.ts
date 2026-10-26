import { verifyServerUserId } from '../verifyUser';

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
