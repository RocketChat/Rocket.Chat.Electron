import { fetchInfo } from './renderer';

describe('servers/fetch-info', () => {
  const serverVersion = Array.from({ length: 3 }, () =>
    Math.round(Math.random() * 9)
  ).join('.');

  const originalFetch = global.fetch;

  // Maps a requested home URL to the effective URL it resolves to.
  // Mirrors `fetch` following redirects: `response.url` is the final URL.
  const redirects: Record<string, string> = {
    'http://localhost:3000/redirect': 'http://localhost:3000/subdir/',
  };

  const createResponse = (url: string, body?: unknown): Response =>
    ({
      ok: true,
      url,
      statusText: 'OK',
      json: async () => body,
    }) as unknown as Response;

  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const requestedUrl = typeof input === 'string' ? input : input.toString();

      // api/info endpoint request
      if (/\/api\/info$/.test(requestedUrl)) {
        return createResponse(requestedUrl, {
          success: true,
          version: serverVersion,
        });
      }

      // home request — `.url` reflects the final URL after redirects
      const effectiveUrl = redirects[requestedUrl] ?? requestedUrl;
      return createResponse(effectiveUrl);
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reaches the server at root directory', async () => {
    const [effectiveUrl, version] = await fetchInfo('http://localhost:3000/');
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/');
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server at subdirectory', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/subdir/'
    );
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/subdir/');
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server at deep subdirectory', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/subdir/subdir/subdir/'
    );
    expect(effectiveUrl).toStrictEqual(
      'http://localhost:3000/subdir/subdir/subdir/'
    );
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server after redirection', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/redirect'
    );
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/subdir/');
    expect(version).toStrictEqual(serverVersion);
  });

  describe('with credentials in the URL', () => {
    it('does not send the credentials inside the request URL', async () => {
      await fetchInfo('http://user:pass@localhost:3000/');

      const requestedUrls = (global.fetch as jest.Mock).mock.calls.map(
        ([input]) => String(input)
      );
      expect(requestedUrls).toStrictEqual([
        'http://localhost:3000/',
        'http://localhost:3000/api/info',
      ]);
    });

    it('sends the credentials as a Basic authorization header', async () => {
      await fetchInfo('http://user:pass@localhost:3000/');

      for (const [, init] of (global.fetch as jest.Mock).mock.calls) {
        expect(new Headers(init?.headers).get('Authorization')).toBe(
          `Basic ${btoa('user:pass')}`
        );
      }
    });

    it('keeps the credentials in the resolved URL', async () => {
      const [effectiveUrl, version] = await fetchInfo(
        'http://user:pass@localhost:3000/redirect'
      );
      expect(effectiveUrl).toStrictEqual(
        'http://user:pass@localhost:3000/subdir/'
      );
      expect(version).toStrictEqual(serverVersion);
    });

    it('does not move the credentials to a redirect on another host', async () => {
      redirects['http://localhost:3000/elsewhere'] = 'http://other.host/';

      const [effectiveUrl] = await fetchInfo(
        'http://user:pass@localhost:3000/elsewhere'
      );
      expect(effectiveUrl).toStrictEqual('http://other.host/');
    });
  });
});
