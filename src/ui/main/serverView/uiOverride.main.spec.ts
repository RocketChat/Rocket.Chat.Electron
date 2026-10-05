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
});
