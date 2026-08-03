import { fetchInfo } from '../renderer';

describe('servers/renderer fetchInfo', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns resolved url and version from api/info', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://open.rocket.chat/',
      })
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://open.rocket.chat/api/info',
        json: async () => ({ success: true, version: '6.5.0' }),
      }) as any;

    const [url, version] = await fetchInfo('https://open.rocket.chat');
    expect(version).toBe('6.5.0');
    expect(url).toBe('https://open.rocket.chat/');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('sends basic auth when credentials are in the URL', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://user:pass@open.rocket.chat/',
      })
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://user:pass@open.rocket.chat/api/info',
        json: async () => ({ success: true, version: '6.0.0' }),
      }) as any;

    await fetchInfo('https://user:pass@open.rocket.chat');
    const firstCall = (global.fetch as jest.Mock).mock.calls[0];
    const { headers }: { headers: Headers } = firstCall[1];
    expect(headers.get('Authorization')).toMatch(/^Basic /);
  });

  it('throws when home response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    }) as any;
    await expect(fetchInfo('https://missing.example')).rejects.toThrow(
      'Not Found'
    );
  });

  it('throws when api/info response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, url: 'https://open.rocket.chat/' })
      .mockResolvedValueOnce({ ok: false, statusText: 'Server Error' }) as any;
    await expect(fetchInfo('https://open.rocket.chat')).rejects.toThrow(
      'Server Error'
    );
  });

  it('throws when api/info success is false', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, url: 'https://open.rocket.chat/' })
      .mockResolvedValueOnce({
        ok: true,
        url: 'https://open.rocket.chat/api/info',
        json: async () => ({ success: false }),
      }) as any;
    await expect(fetchInfo('https://open.rocket.chat')).rejects.toThrow();
  });
});
