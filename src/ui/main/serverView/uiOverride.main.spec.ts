import { session } from 'electron';

import { dispatch, select } from '../../../store';
import {
  applyUiOverride,
  clearUiOverride,
  getUiOverride,
  getUiOverrideBundleUrls,
  getUiOverrideServerUrls,
  getUiOverrideVersion,
  isUiServedFromServer,
  passthrough,
  prepareIndexHtml,
} from './uiOverride';

jest.mock('electron', () => ({ session: { fromPartition: jest.fn() } }));
jest.mock('.', () => ({ getWebContentsByServerUrl: jest.fn() }));
jest.mock('../../../store', () => ({ dispatch: jest.fn(), select: jest.fn() }));

const viteIndex =
  '<!DOCTYPE html><html><head><base href="/" /><script type="module" src="/bundle/index-abc.js"></script></head><body><div id="react-root"></div></body></html>';

describe('prepareIndexHtml', () => {
  it('injects the runtime config the Meteor server would provide', () => {
    const html = prepareIndexHtml(viteIndex, 'https://open.rocket.chat');

    expect(html).toContain(
      '<head><script>window.__meteor_runtime_config__ = {"ROOT_URL":"https://open.rocket.chat/","ROOT_URL_PATH_PREFIX":""};</script>'
    );
    expect(html).toContain('<base href="/" />');
  });

  it('keeps a server path prefix in the base href and runtime config', () => {
    const html = prepareIndexHtml(viteIndex, 'https://example.com/chat');

    expect(html).toContain('<base href="/chat/" />');
    expect(html).toContain(
      '"ROOT_URL":"https://example.com/chat/","ROOT_URL_PATH_PREFIX":"/chat"'
    );
  });
});

describe('isUiServedFromServer', () => {
  it('sends server routes to the server', () => {
    expect(isUiServedFromServer('/api/v1/me', '')).toBe(true);
    expect(isUiServedFromServer('/chat/avatar/user', '/chat')).toBe(true);
  });

  it('lets client routes load the preview UI', () => {
    expect(isUiServedFromServer('/home', '')).toBe(false);
    expect(isUiServedFromServer('/chat/channel/general', '/chat')).toBe(false);
  });
});

// A response whose body never ends, like a media download the page stopped reading.
const pendingResponse = () =>
  new Response(new ReadableStream<Uint8Array>({ pull: () => undefined }), {
    status: 206,
    headers: { 'content-range': 'bytes 0-9/100' },
  });

const sessionFetching = (respond: () => Promise<Response>) => {
  const signals: AbortSignal[] = [];
  const fetch = jest.fn(async (_request: Request, init: RequestInit) => {
    signals.push(init.signal as AbortSignal);
    return respond();
  });
  return { ses: { fetch } as unknown as Electron.Session, fetch, signals };
};

describe('passthrough', () => {
  const request = () =>
    new Request('https://open.rocket.chat/file-upload/a.mov');

  it('aborts the load when the page drops the response', async () => {
    const { ses, signals } = sessionFetching(async () => pendingResponse());
    const loads = new Set<AbortController>();

    const response = await passthrough(ses, request(), loads);
    expect(loads.size).toBe(1);
    await response.body?.cancel();

    expect(signals[0].aborted).toBe(true);
    expect(loads.size).toBe(0);
  });

  it('releases the load once the page reads the body to the end', async () => {
    const { ses, signals } = sessionFetching(
      async () => new Response('{"version":"8.0.0"}')
    );
    const loads = new Set<AbortController>();

    const response = await passthrough(ses, request(), loads);

    await expect(response.text()).resolves.toBe('{"version":"8.0.0"}');
    expect(signals[0].aborted).toBe(false);
    expect(loads.size).toBe(0);
  });

  it('keeps the status and headers of the server response', async () => {
    const { ses } = sessionFetching(async () => pendingResponse());

    const response = await passthrough(ses, request(), new Set());

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 0-9/100');
    await response.body?.cancel();
  });

  it('returns a response without a body as it is', async () => {
    const empty = new Response(null, { status: 204 });
    const { ses } = sessionFetching(async () => empty);
    const loads = new Set<AbortController>();

    await expect(passthrough(ses, request(), loads)).resolves.toBe(empty);
    expect(loads.size).toBe(0);
  });

  it('releases the load when the request fails', async () => {
    const { ses } = sessionFetching(async () => {
      throw new Error('net::ERR_CONNECTION_RESET');
    });
    const loads = new Set<AbortController>();

    await expect(passthrough(ses, request(), loads)).rejects.toThrow(
      'net::ERR_CONNECTION_RESET'
    );
    expect(loads.size).toBe(0);
  });
});

describe('applyUiOverride', () => {
  const protocol = {
    isProtocolHandled: jest.fn(() => false),
    handle: jest.fn(),
    unhandle: jest.fn(),
  };

  const bundle =
    (url: string, label = url, version?: string) =>
    async () => ({ url, label, version });

  const deferred = () => {
    let resolve: (url: string) => void = () => undefined;
    const promise = new Promise<{ url: string; label: string }>((done) => {
      resolve = (url) => done({ url, label: url });
    });
    return { load: () => promise, resolve };
  };

  const knownServers = (...urls: string[]) =>
    (select as jest.Mock).mockImplementation((selector) =>
      selector({ servers: urls.map((url) => ({ url })) })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (session.fromPartition as jest.Mock).mockReturnValue({
      protocol,
      fetch: jest.fn(async () => pendingResponse()),
      clearStorageData: jest.fn(async () => undefined),
      clearCache: jest.fn(async () => undefined),
    });
  });

  it('records the source it installed, so an update can load it again', async () => {
    const url = 'https://records.example.com/';
    knownServers(url);
    const source = {
      key: 'develop',
      label: 'develop',
      load: bundle('file:///previews/develop', 'develop @ b4560f6', 'sha256:d'),
    };

    await expect(applyUiOverride(url, source)).resolves.toBe(
      'develop @ b4560f6'
    );

    expect(protocol.handle).toHaveBeenCalledTimes(1);
    expect(getUiOverride(url)).toBe(source);
    expect(getUiOverrideBundleUrls()).toContain('file:///previews/develop/');
    expect(getUiOverrideVersion(url)).toBe('sha256:d');
    expect(getUiOverrideServerUrls('develop')).toContain(url);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          url,
          uiPreview: 'develop @ b4560f6',
          uiPreviewSource: 'develop',
        },
      })
    );
  });

  it('drops a load that finishes after the server UI was restored', async () => {
    const url = 'https://restored.example.com/';
    knownServers(url);
    await applyUiOverride(url, {
      key: '1',
      label: 'PR #1',
      load: bundle('file:///1'),
    });
    const update = deferred();

    const pending = applyUiOverride(url, {
      key: '1',
      label: 'PR #1',
      load: update.load,
    });
    await clearUiOverride(url);
    update.resolve('file:///1-newer');

    await expect(pending).resolves.toBeNull();
    expect(protocol.handle).toHaveBeenCalledTimes(1);
    expect(protocol.unhandle).toHaveBeenCalledTimes(1);
    expect(getUiOverride(url)).toBeUndefined();
    expect(getUiOverrideBundleUrls()).not.toContain('file:///1/');
    expect(getUiOverrideServerUrls('1')).not.toContain(url);
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: { url, uiPreview: undefined, uiPreviewSource: undefined },
      })
    );
  });

  it('keeps the newest of two overlapping loads', async () => {
    const url = 'https://overlap.example.com/';
    knownServers(url);
    const first = deferred();
    const second = deferred();

    const older = applyUiOverride(url, {
      key: '1',
      label: 'PR #1',
      load: first.load,
    });
    const newer = applyUiOverride(url, {
      key: '2',
      label: 'PR #2',
      load: second.load,
    });
    second.resolve('file:///2');
    first.resolve('file:///1');

    await expect(newer).resolves.toBe('file:///2');
    await expect(older).resolves.toBeNull();
    expect(protocol.handle).toHaveBeenCalledTimes(1);
    expect(getUiOverride(url)?.label).toBe('PR #2');
  });

  it('drops a load for a server removed while it was pulling', async () => {
    const url = 'https://removed.example.com/';
    knownServers();

    await expect(
      applyUiOverride(url, {
        key: 'develop',
        label: 'develop',
        load: bundle('file:///d'),
      })
    ).resolves.toBeNull();

    expect(protocol.handle).not.toHaveBeenCalled();
    expect(getUiOverride(url)).toBeUndefined();
  });

  const startLoad = async (url: string) => {
    const handler = protocol.handle.mock.calls[
      protocol.handle.mock.calls.length - 1
    ][1] as (request: Request) => Promise<Response>;
    const { results } = (session.fromPartition as jest.Mock).mock;
    const { fetch } = results[results.length - 1].value as {
      fetch: jest.Mock;
    };
    await handler(new Request(new URL('api/v1/me', url)));
    return fetch.mock.calls[fetch.mock.calls.length - 1][1]
      .signal as AbortSignal;
  };

  it("aborts the preview's loads when the server UI is restored", async () => {
    const url = 'https://aborted-on-restore.example.com/';
    knownServers(url);
    await applyUiOverride(url, {
      key: '1',
      label: 'PR #1',
      load: bundle('file:///1'),
    });
    const signal = await startLoad(url);

    await clearUiOverride(url);

    expect(signal.aborted).toBe(true);
  });

  it("aborts the previous preview's loads when another one is applied", async () => {
    const url = 'https://aborted-on-apply.example.com/';
    knownServers(url);
    await applyUiOverride(url, {
      key: '1',
      label: 'PR #1',
      load: bundle('file:///1'),
    });
    const signal = await startLoad(url);

    await applyUiOverride(url, {
      key: '2',
      label: 'PR #2',
      load: bundle('file:///2'),
    });

    expect(signal.aborted).toBe(true);
  });
});
