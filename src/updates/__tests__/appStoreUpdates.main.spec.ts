import { shell } from 'electron';

import {
  fetchLatestAppStoreVersion,
  isStoreVersionNewer,
  openAppStore,
} from '../appStoreUpdates';

jest.mock('electron', () => ({
  app: {
    isPackaged: true,
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

describe('fetchLatestAppStoreVersion', () => {
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

    const result = await fetchLatestAppStoreVersion();

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

    const result = await fetchLatestAppStoreVersion();

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

    expect(await fetchLatestAppStoreVersion()).toBeNull();
  });

  it('returns null on a malformed JSON shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nonsense: true }),
    });

    expect(await fetchLatestAppStoreVersion()).toBeNull();
  });

  it('returns null when the result entry has no usable version', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [{ trackViewUrl: 'https://example.com' }],
      }),
    });

    expect(await fetchLatestAppStoreVersion()).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    expect(await fetchLatestAppStoreVersion()).toBeNull();
  });

  it('returns null on a network rejection', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await fetchLatestAppStoreVersion()).toBeNull();
  });

  it('returns null when the request is aborted (timeout)', async () => {
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const { signal } = options as { signal: AbortSignal };
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const promise = fetchLatestAppStoreVersion();

    // Trigger the abort synchronously instead of waiting on the real timer.
    const controllerAbort = (global.fetch as jest.Mock).mock.calls[0][1]
      .signal as AbortSignal;
    controllerAbort.dispatchEvent(new Event('abort'));

    expect(await promise).toBeNull();
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

describe('openAppStore', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the provided store url', async () => {
    await openAppStore(
      'https://apps.apple.com/us/app/rocket-chat/id1086818840'
    );
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/us/app/rocket-chat/id1086818840'
    );
  });

  it('falls back to the constant app store url when none is provided', async () => {
    await openAppStore();
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id1086818840'
    );
  });
});
