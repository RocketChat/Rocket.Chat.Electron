import { shell } from 'electron';

import {
  fetchLatestStoreVersion,
  isStoreVersionNewer,
  openStorePage,
} from '../storeUpdates';

jest.mock('electron', () => ({
  app: {
    isPackaged: true,
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

describe('fetchLatestStoreVersion — mas', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('resolves the version and store url on a happy-path lookup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [
          {
            trackId: 1086818840,
            bundleId: 'chat.rocket',
            version: '4.16.0',
            kind: 'mac-software',
            trackViewUrl:
              'https://apps.apple.com/us/app/rocket-chat/id1086818840?mt=12&uo=4',
          },
        ],
      }),
    });

    const result = await fetchLatestStoreVersion('mas');

    expect(result).toEqual({
      version: '4.16.0',
      storeUrl:
        'https://apps.apple.com/us/app/rocket-chat/id1086818840?mt=12&uo=4',
    });
  });

  it('falls back to the constant store url when the response omits trackViewUrl', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [{ version: '4.16.0' }],
      }),
    });

    const result = await fetchLatestStoreVersion('mas');

    expect(result).toEqual({
      version: '4.16.0',
      storeUrl: 'https://apps.apple.com/app/id1086818840',
    });
  });

  it('returns null when resultCount is 0', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resultCount: 0, results: [] }),
    });

    expect(await fetchLatestStoreVersion('mas')).toBeNull();
  });

  it('returns null on a malformed JSON shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nonsense: true }),
    });

    expect(await fetchLatestStoreVersion('mas')).toBeNull();
  });

  it('returns null when the result entry has no usable version', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [{ trackViewUrl: 'https://example.com' }],
      }),
    });

    expect(await fetchLatestStoreVersion('mas')).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    expect(await fetchLatestStoreVersion('mas')).toBeNull();
  });

  it('returns null on a network rejection', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await fetchLatestStoreVersion('mas')).toBeNull();
  });

  it('returns null when the request is aborted (timeout), manually signaling abort', async () => {
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const { signal } = options as { signal: AbortSignal };
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const promise = fetchLatestStoreVersion('mas');

    // Trigger the abort synchronously instead of waiting on the real timer.
    const controllerAbort = (global.fetch as jest.Mock).mock.calls[0][1]
      .signal as AbortSignal;
    controllerAbort.dispatchEvent(new Event('abort'));

    expect(await promise).toBeNull();
  });

  it("returns null when the module's own 10s timeout fires, driven by fake timers", async () => {
    jest.useFakeTimers();

    try {
      global.fetch = jest.fn().mockImplementation((_url, options) => {
        const { signal } = options as { signal: AbortSignal };
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(
              new DOMException('The operation was aborted.', 'AbortError')
            );
          });
        });
      });

      const promise = fetchLatestStoreVersion('mas');

      // Advances the real setTimeout(() => controller.abort(), 10_000) inside
      // fetchJson, rather than firing the abort event by hand.
      await jest.advanceTimersByTimeAsync(10_000);

      expect(await promise).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('fetchLatestStoreVersion — windows', () => {
  it('has no version API and always resolves null without calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    expect(await fetchLatestStoreVersion('windows')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('fetchLatestStoreVersion — snap', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses the stable/latest channel-map entry', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'name': 'rocketchat-desktop',
        'channel-map': [
          {
            channel: { risk: 'edge', track: 'latest', architecture: 'amd64' },
            version: '4.17.0-edge',
          },
          {
            channel: { risk: 'beta', track: 'latest', architecture: 'amd64' },
            version: '4.17.0-beta',
          },
          {
            channel: { risk: 'stable', track: 'latest', architecture: 'amd64' },
            version: '4.16.0',
          },
        ],
      }),
    });

    const result = await fetchLatestStoreVersion('snap');

    expect(result).toEqual({
      version: '4.16.0',
      storeUrl: 'https://snapcraft.io/rocketchat-desktop',
    });
  });

  it('sends the Snap-Device-Series: 16 header', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'channel-map': [
          { channel: { risk: 'stable', track: 'latest' }, version: '4.16.0' },
        ],
      }),
    });
    global.fetch = fetchMock;

    await fetchLatestStoreVersion('snap');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.snapcraft.io/v2/snaps/info/rocketchat-desktop',
      expect.objectContaining({
        headers: { 'Snap-Device-Series': '16' },
      })
    );
  });

  it('falls back to any stable entry when no latest-track stable entry exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'channel-map': [
          {
            channel: { risk: 'stable', track: '4.x', architecture: 'amd64' },
            version: '4.16.0',
          },
        ],
      }),
    });

    const result = await fetchLatestStoreVersion('snap');

    expect(result).toEqual({
      version: '4.16.0',
      storeUrl: 'https://snapcraft.io/rocketchat-desktop',
    });
  });

  it('returns null when no stable entry exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        'channel-map': [
          { channel: { risk: 'edge', track: 'latest' }, version: '4.17.0' },
          { channel: { risk: 'beta', track: 'latest' }, version: '4.17.0' },
        ],
      }),
    });

    expect(await fetchLatestStoreVersion('snap')).toBeNull();
  });

  it('returns null on a malformed response (missing channel-map)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nonsense: true }),
    });

    expect(await fetchLatestStoreVersion('snap')).toBeNull();
  });

  it('returns null on a network rejection', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await fetchLatestStoreVersion('snap')).toBeNull();
  });
});

describe('fetchLatestStoreVersion — flatpak', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses the newest (first) release entry', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        releases: [
          { type: 'stable', version: '4.16.0', timestamp: '1786320000' },
          { version: '4.15.6' },
        ],
      }),
    });

    const result = await fetchLatestStoreVersion('flatpak');

    expect(result).toEqual({
      version: '4.16.0',
      storeUrl: 'https://flathub.org/apps/chat.rocket.RocketChat',
    });
  });

  it('returns null when releases is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    expect(await fetchLatestStoreVersion('flatpak')).toBeNull();
  });

  it('returns null on a malformed response (missing releases)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nonsense: true }),
    });

    expect(await fetchLatestStoreVersion('flatpak')).toBeNull();
  });

  it('returns null on a network rejection', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await fetchLatestStoreVersion('flatpak')).toBeNull();
  });
});

describe('isStoreVersionNewer', () => {
  it('returns false when the store version matches the local numeric core despite a prerelease suffix', () => {
    expect(isStoreVersionNewer('4.16.0', '4.17.0-alpha.1')).toBe(false);
  });

  it('returns true when the store version is newer', () => {
    expect(isStoreVersionNewer('4.17.0', '4.16.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isStoreVersionNewer('4.16.0', '4.16.0')).toBe(false);
  });

  it('returns true for a newer patch version', () => {
    expect(isStoreVersionNewer('4.16.1', '4.16.0')).toBe(true);
  });

  it('compares multi-digit segments numerically, not lexicographically', () => {
    expect(isStoreVersionNewer('4.10.0', '4.9.0')).toBe(true);
    expect(isStoreVersionNewer('4.9.0', '4.10.0')).toBe(false);
  });
});

describe('openStorePage — mas', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the provided store url', async () => {
    await openStorePage(
      'mas',
      'https://apps.apple.com/us/app/rocket-chat/id1086818840'
    );
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/us/app/rocket-chat/id1086818840'
    );
  });

  it('falls back to the constant app store url when none is provided', async () => {
    await openStorePage('mas');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('accepts an itunes.apple.com https url', async () => {
    await openStorePage(
      'mas',
      'https://itunes.apple.com/us/app/rocket-chat/id1086818840'
    );
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://itunes.apple.com/us/app/rocket-chat/id1086818840'
    );
  });

  it('falls back on an http (non-https) downgrade', async () => {
    await openStorePage('mas', 'http://apps.apple.com/app/id1086818840');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('falls back on a file: URL', async () => {
    await openStorePage('mas', 'file:///etc/passwd');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('falls back on a javascript: URL', async () => {
    await openStorePage('mas', 'javascript:alert(1)');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('falls back on an https url with an unexpected host', async () => {
    await openStorePage('mas', 'https://evil.example.com/apps.apple.com');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('falls back on a malformed URL string', async () => {
    await openStorePage('mas', 'not a url');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });

  it('falls back when no url is provided', async () => {
    await openStorePage('mas', undefined);
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });
});

describe('openStorePage — other stores use their hardcoded constant, ignoring any override', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('windows always opens the ms-windows-store URI', async () => {
    await openStorePage('windows', 'https://example.com/should-be-ignored');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'ms-windows-store://pdp/?ProductId=9nblggh52jv6'
    );
  });

  it('snap always opens the snapcraft.io listing', async () => {
    await openStorePage('snap', 'https://example.com/should-be-ignored');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://snapcraft.io/rocketchat-desktop'
    );
  });

  it('flatpak always opens the flathub.org listing', async () => {
    await openStorePage('flatpak', 'https://example.com/should-be-ignored');
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://flathub.org/apps/chat.rocket.RocketChat'
    );
  });
});
