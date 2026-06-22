import { desktopCapturer } from 'electron';

import { handle } from '../../ipc/main';
import {
  clearDesktopCapturerCache,
  getDesktopCapturerCacheStatus,
  handleDesktopCapturerGetSources,
  prewarmDesktopCapturerCache,
  refreshDesktopCapturerCache,
} from '../desktopCapturerCache';

jest.mock('electron', () => ({
  desktopCapturer: {
    getSources: jest.fn(),
  },
}));

jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

const getSourcesMock = desktopCapturer.getSources as jest.MockedFunction<
  typeof desktopCapturer.getSources
>;
const handleMock = handle as jest.MockedFunction<typeof handle>;

type SourceStub = {
  id: string;
  name: string;
  thumbnail: { isEmpty: () => boolean };
};

const makeSource = (id: string, name: string, empty = false): SourceStub => ({
  id,
  name,
  thumbnail: { isEmpty: () => empty },
});

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const OPTIONS = { types: ['window', 'screen'] } as Electron.SourcesOptions;

// Registers the IPC handler and returns the captured callback. Filtered
// results are only observable through this handler (it returns the cache).
const getHandler = () => {
  handleDesktopCapturerGetSources();
  const lastCall = handleMock.mock.calls[handleMock.mock.calls.length - 1];
  expect(lastCall[0]).toBe('desktop-capturer-get-sources');
  return lastCall[1] as (webContents: unknown, opts: unknown) => Promise<any>;
};

describe('screenSharing/desktopCapturerCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    clearDesktopCapturerCache();
  });

  afterEach(() => {
    // The module schedules no timers of its own, but two tests opt into fake
    // timers; clear any pending fake handle before restoring real timers so
    // nothing survives into the next test or blocks jest --forceExit.
    jest.clearAllTimers();
    jest.useRealTimers();
    clearDesktopCapturerCache();
  });

  describe('refreshDesktopCapturerCache', () => {
    it('fetches sources and populates the cache with valid sources', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('1', 'Screen 1') as any,
        makeSource('2', 'Window 2') as any,
      ]);

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      expect(getSourcesMock).toHaveBeenCalledWith(OPTIONS);
      const status = getDesktopCapturerCacheStatus();
      expect(status.cached).toBe(true);
      expect(status.pending).toBe(false);
    });

    it('does not start a second fetch while one is pending', async () => {
      let resolveFetch: (value: any) => void = () => undefined;
      getSourcesMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }) as any
      );

      refreshDesktopCapturerCache(OPTIONS);
      // Second call should short-circuit because a promise is in flight.
      refreshDesktopCapturerCache(OPTIONS);

      expect(getSourcesMock).toHaveBeenCalledTimes(1);
      expect(getDesktopCapturerCacheStatus().pending).toBe(true);

      resolveFetch([makeSource('1', 'Screen 1') as any]);
      await flushPromises();

      expect(getDesktopCapturerCacheStatus().pending).toBe(false);
    });

    it('filters out sources with empty or whitespace names', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('1', '') as any,
        makeSource('2', '   ') as any,
        makeSource('3', 'Valid') as any,
      ]);

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      // Filtered results are observable through the cache via the handler.
      const handler = getHandler();
      const result = (await handler({ id: 1 }, OPTIONS)) as any[];

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('filters out sources with an empty thumbnail', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('1', 'Empty thumb', true) as any,
        makeSource('2', 'Good thumb', false) as any,
      ]);

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      const handler = getHandler();
      const result = (await handler({ id: 1 }, OPTIONS)) as any[];

      expect(result.map((s) => s.id)).toEqual(['2']);
    });

    it('serves a cached validation hit without re-checking the thumbnail', async () => {
      // First refresh caches source "2" as valid.
      getSourcesMock.mockResolvedValueOnce([
        makeSource('2', 'Good thumb', false) as any,
      ]);
      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      // Second refresh: same id, now reports an empty thumbnail, but the
      // validation cache should still treat it as valid (within TTL).
      const emptyThumbSource = makeSource('2', 'Good thumb', true);
      const isEmptySpy = jest.spyOn(emptyThumbSource.thumbnail, 'isEmpty');
      getSourcesMock.mockResolvedValueOnce([emptyThumbSource as any]);

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      const handler = getHandler();
      const result = (await handler({ id: 1 }, OPTIONS)) as any[];

      expect(result.map((s) => s.id)).toEqual(['2']);
      expect(isEmptySpy).not.toHaveBeenCalled();
    });

    it('keeps the previous cached sources when a background fetch rejects', async () => {
      // Seed a cache first.
      getSourcesMock.mockResolvedValueOnce([makeSource('1', 'Seeded') as any]);
      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      getSourcesMock.mockRejectedValueOnce(new Error('boom'));

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      // Cache untouched: handler still serves the seeded source.
      const handler = getHandler();
      const result = (await handler({ id: 1 }, OPTIONS)) as any[];

      expect(result.map((s) => s.id)).toEqual(['1']);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Background cache refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('leaves the cache empty when the fetch rejects with no prior cache', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      getSourcesMock.mockRejectedValueOnce(new Error('boom'));

      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      expect(getDesktopCapturerCacheStatus()).toEqual({
        cached: false,
        pending: false,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Background cache refresh failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('prewarmDesktopCapturerCache', () => {
    it('refreshes with window and screen source types', async () => {
      getSourcesMock.mockResolvedValueOnce([]);
      prewarmDesktopCapturerCache();
      await flushPromises();

      expect(getSourcesMock).toHaveBeenCalledWith({
        types: ['window', 'screen'],
      });
    });
  });

  describe('clearDesktopCapturerCache', () => {
    it('resets cache and pending state', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('1', 'Screen 1') as any,
      ]);
      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();
      expect(getDesktopCapturerCacheStatus().cached).toBe(true);

      clearDesktopCapturerCache();

      expect(getDesktopCapturerCacheStatus()).toEqual({
        cached: false,
        pending: false,
      });
    });
  });

  describe('getDesktopCapturerCacheStatus', () => {
    it('reports no cache and no pending work initially', () => {
      expect(getDesktopCapturerCacheStatus()).toEqual({
        cached: false,
        pending: false,
      });
    });
  });

  describe('handleDesktopCapturerGetSources', () => {
    it('registers the IPC handler on the expected channel', () => {
      getHandler();
    });

    it('returns cached sources immediately when a fresh cache exists', async () => {
      getSourcesMock.mockResolvedValueOnce([makeSource('1', 'Cached') as any]);
      refreshDesktopCapturerCache(OPTIONS);
      await flushPromises();

      const handler = getHandler();
      const result = await handler({ id: 1 }, OPTIONS);

      expect(result.map((s: SourceStub) => s.id)).toEqual(['1']);
    });

    it('unwraps an array-wrapped options argument', async () => {
      const handler = getHandler();
      getSourcesMock.mockResolvedValueOnce([makeSource('1', 'Cached') as any]);

      await handler({ id: 1 }, [OPTIONS]);

      expect(getSourcesMock).toHaveBeenCalledWith(OPTIONS);
    });

    it('triggers a background refresh when the cache is stale', async () => {
      jest.useFakeTimers();
      getSourcesMock.mockResolvedValue([makeSource('1', 'Cached') as any]);

      refreshDesktopCapturerCache(OPTIONS);
      // Allow the initial fetch to settle under fake timers.
      await Promise.resolve();
      await Promise.resolve();

      // Advance beyond the 3000ms stale threshold.
      jest.advanceTimersByTime(3001);

      const handler = getHandler();
      const result = await handler({ id: 1 }, OPTIONS);

      // Still returns the (stale) cached sources synchronously.
      expect(result.map((s: SourceStub) => s.id)).toEqual(['1']);
      // A background refresh was kicked off (second getSources call).
      expect(getSourcesMock).toHaveBeenCalledTimes(2);
    });

    it('does not refresh when a fresh cache is within the stale threshold', async () => {
      jest.useFakeTimers();
      getSourcesMock.mockResolvedValue([makeSource('1', 'Cached') as any]);

      refreshDesktopCapturerCache(OPTIONS);
      await Promise.resolve();
      await Promise.resolve();

      jest.advanceTimersByTime(1000);

      const handler = getHandler();
      await handler({ id: 1 }, OPTIONS);

      expect(getSourcesMock).toHaveBeenCalledTimes(1);
    });

    it('awaits the in-flight promise when one is pending and no cache exists', async () => {
      let resolveFetch: (value: any) => void = () => undefined;
      getSourcesMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }) as any
      );

      // Start a fetch so a promise is pending but cache is still null.
      refreshDesktopCapturerCache(OPTIONS);

      const handler = getHandler();
      const handlerPromise = handler({ id: 1 }, OPTIONS);

      resolveFetch([makeSource('9', 'Pending') as any]);
      const result = await handlerPromise;

      expect(result.map((s: SourceStub) => s.id)).toEqual(['9']);
    });

    it('refreshes then awaits when there is neither cache nor pending promise', async () => {
      getSourcesMock.mockResolvedValueOnce([makeSource('5', 'Fresh') as any]);

      const handler = getHandler();
      const result = await handler({ id: 1 }, OPTIONS);

      expect(getSourcesMock).toHaveBeenCalledWith(OPTIONS);
      expect(result.map((s: SourceStub) => s.id)).toEqual(['5']);
    });
  });
});
