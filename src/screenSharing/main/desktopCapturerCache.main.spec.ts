import { desktopCapturer } from 'electron';

import { handle } from '../../ipc/main';
import {
  clearDesktopCapturerCache,
  getCachedSources,
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

// Flushes pending microtasks under fake timers (no real time passes).
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

// Registers the IPC handler and returns the captured callback.
const getHandler = () => {
  handleDesktopCapturerGetSources();
  const lastCall = handleMock.mock.calls[handleMock.mock.calls.length - 1];
  expect(lastCall[0]).toBe('desktop-capturer-get-sources');
  return lastCall[1] as (webContents: unknown, opts: unknown) => Promise<any>;
};

describe('screenSharing/desktopCapturerCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fake timers stay on for the whole suite: the module reads Date.now()
    // directly, and toggling real/fake timers mid-test discards the fake
    // clock's advance instead of merging it into real time.
    jest.useFakeTimers();
    clearDesktopCapturerCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clearDesktopCapturerCache();
  });

  describe('handleDesktopCapturerGetSources — first-ever call', () => {
    it('awaits a screens refresh and kicks a background windows refresh', async () => {
      getSourcesMock.mockImplementation(async (options) => {
        if (options?.types?.[0] === 'screen') {
          return [makeSource('screen:0', 'Screen 1') as any];
        }
        return [makeSource('window:1', 'Window 1') as any];
      });

      const handler = getHandler();
      const resultPromise = handler({ id: 1 }, undefined);
      await flushMicrotasks();
      const result = await resultPromise;

      // Screens content is present immediately (awaited).
      expect(result.map((s: SourceStub) => s.id)).toContain('screen:0');
      expect(getSourcesMock).toHaveBeenCalledWith({ types: ['screen'] });

      await flushMicrotasks();

      // Windows refresh was kicked off in the background.
      expect(getSourcesMock).toHaveBeenCalledWith({ types: ['window'] });
      expect(getCachedSources().map((s) => s.id)).toEqual(
        expect.arrayContaining(['screen:0', 'window:1'])
      );
    });

    it('populates both buckets on cold start without waiting out the cooldown, but still gates the next steady-state refresh', async () => {
      getSourcesMock.mockImplementation(async (options) => {
        if (options?.types?.[0] === 'screen') {
          return [makeSource('screen:0', 'Screen 1') as any];
        }
        return [makeSource('window:1', 'Window 1') as any];
      });

      const handler = getHandler();
      const resultPromise = handler({ id: 1 }, undefined);
      await flushMicrotasks();
      await resultPromise;
      await flushMicrotasks();

      // No time was advanced between the screens and windows legs, yet both
      // buckets are populated: the cold-start windows kick bypassed the
      // cooldown gate.
      expect(getCachedSources().map((s) => s.id)).toEqual(
        expect.arrayContaining(['screen:0', 'window:1'])
      );
      expect(getSourcesMock).toHaveBeenCalledTimes(2);

      // Immediately after, a steady-state refresh is still cooldown-gated.
      getSourcesMock.mockClear();
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();
      expect(getSourcesMock).not.toHaveBeenCalled();

      jest.advanceTimersByTime(4001);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();
      expect(getSourcesMock).toHaveBeenCalledTimes(1);
    });

    it('only ever calls getSources with a single type per enumeration', async () => {
      getSourcesMock.mockResolvedValue([]);

      const handler = getHandler();
      await handler({ id: 1 }, undefined);
      await flushMicrotasks();

      getSourcesMock.mock.calls.forEach(([options]) => {
        expect(options?.types).toHaveLength(1);
      });
    });
  });

  describe('empty results never clobber a populated bucket', () => {
    it('keeps existing screens bucket when a later enumeration returns empty', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('screen:0', 'Screen 1') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual(['screen:0']);

      // Advance past cooldown so a second enumeration is allowed.
      jest.advanceTimersByTime(4001);

      getSourcesMock.mockResolvedValueOnce([]);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual(['screen:0']);
    });

    it('warns only once per occurrence of an empty result on a populated bucket', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      getSourcesMock.mockResolvedValueOnce([
        makeSource('screen:0', 'Screen 1') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      jest.advanceTimersByTime(4001);

      getSourcesMock.mockResolvedValueOnce([]);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      const emptyWarnings = warnSpy.mock.calls.filter(([msg]) =>
        String(msg).includes('keeping previous cache')
      );
      expect(emptyWarnings).toHaveLength(1);
      warnSpy.mockRestore();
    });
  });

  describe('thumbnail merge by id', () => {
    it('keeps the last good thumbnail for a source whose new thumbnail is empty', async () => {
      const goodThumbnail = { isEmpty: () => false };
      getSourcesMock.mockResolvedValueOnce([
        { id: 'window:1', name: 'Window 1', thumbnail: goodThumbnail } as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      jest.advanceTimersByTime(4001);

      getSourcesMock.mockResolvedValueOnce([
        {
          id: 'window:1',
          name: 'Window 1',
          thumbnail: { isEmpty: () => true },
          appIcon: 'icon-data',
        } as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      const merged = getCachedSources().find((s) => s.id === 'window:1');
      expect(merged?.thumbnail).toBe(goodThumbnail);
      expect((merged as any)?.appIcon).toBe('icon-data');
    });

    it('drops a source with an empty thumbnail and no cached fallback', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('window:1', 'Window 1', true) as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      expect(getCachedSources()).toEqual([]);
    });

    it('drops an id absent from a non-empty result (window really closed)', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('window:1', 'Window 1') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      jest.advanceTimersByTime(4001);

      getSourcesMock.mockResolvedValueOnce([
        makeSource('window:2', 'Window 2') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual(['window:2']);
    });

    it('filters out sources with empty or whitespace names', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('1', '') as any,
        makeSource('2', '   ') as any,
        makeSource('3', 'Valid') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['window'] });
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual(['3']);
    });
  });

  describe('cooldown', () => {
    it('prevents a second enumeration within 4s of the previous completion', async () => {
      getSourcesMock.mockResolvedValue([
        makeSource('screen:0', 'Screen 1') as any,
      ]);

      refreshDesktopCapturerCache();
      await flushMicrotasks();
      expect(getSourcesMock).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2000);
      refreshDesktopCapturerCache();
      await flushMicrotasks();
      // Still within cooldown: no second call.
      expect(getSourcesMock).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(2001);
      refreshDesktopCapturerCache();
      await flushMicrotasks();
      // Cooldown elapsed: second enumeration allowed.
      expect(getSourcesMock).toHaveBeenCalledTimes(2);
    });

    it('never runs two enumerations concurrently (single-flight)', async () => {
      let resolveFetch: (value: any) => void = () => undefined;
      getSourcesMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }) as any
      );

      refreshDesktopCapturerCache();
      refreshDesktopCapturerCache();

      expect(getSourcesMock).toHaveBeenCalledTimes(1);
      expect(getDesktopCapturerCacheStatus().pending).toBe(true);

      resolveFetch([makeSource('screen:0', 'Screen 1') as any]);
      await flushMicrotasks();

      expect(getDesktopCapturerCacheStatus().pending).toBe(false);
    });
  });

  describe('error handling', () => {
    it('keeps the previous cached sources when a background fetch rejects', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('screen:0', 'Seeded') as any,
      ]);
      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      jest.advanceTimersByTime(4001);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      getSourcesMock.mockRejectedValueOnce(new Error('boom'));

      refreshDesktopCapturerCache({ types: ['screen'] });
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual(['screen:0']);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background cache refresh failed'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('leaves the cache empty when the fetch rejects with no prior cache', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      getSourcesMock.mockRejectedValueOnce(new Error('boom'));

      refreshDesktopCapturerCache();
      await flushMicrotasks();

      expect(getDesktopCapturerCacheStatus().cached).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background cache refresh failed'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('prewarmDesktopCapturerCache', () => {
    it('refreshes screens first when both buckets are empty', async () => {
      getSourcesMock.mockResolvedValue([]);
      prewarmDesktopCapturerCache();
      await flushMicrotasks();

      expect(getSourcesMock).toHaveBeenCalledWith({ types: ['screen'] });
    });
  });

  describe('clearDesktopCapturerCache', () => {
    it('resets cache and pending state', async () => {
      getSourcesMock.mockResolvedValueOnce([
        makeSource('screen:0', 'Screen 1') as any,
      ]);
      refreshDesktopCapturerCache();
      await flushMicrotasks();
      expect(getDesktopCapturerCacheStatus().cached).toBe(true);

      clearDesktopCapturerCache();

      expect(getDesktopCapturerCacheStatus()).toEqual({
        cached: false,
        pending: false,
      });
      expect(getCachedSources()).toEqual([]);
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

  describe('getCachedSources', () => {
    it('returns merged screens + windows sources, screens first', async () => {
      getSourcesMock.mockImplementation(async (options) => {
        if (options?.types?.[0] === 'screen') {
          return [makeSource('screen:0', 'Screen 1') as any];
        }
        return [makeSource('window:1', 'Window 1') as any];
      });

      const handler = getHandler();
      const resultPromise = handler({ id: 1 }, undefined);
      await flushMicrotasks();
      await resultPromise;
      await flushMicrotasks();

      expect(getCachedSources().map((s) => s.id)).toEqual([
        'screen:0',
        'window:1',
      ]);
    });

    it('returns an empty array when no bucket has been populated', () => {
      expect(getCachedSources()).toEqual([]);
    });
  });

  describe('handleDesktopCapturerGetSources', () => {
    it('registers the IPC handler on the expected channel', () => {
      getHandler();
    });

    it('serves merged cached sources immediately on subsequent calls', async () => {
      getSourcesMock.mockImplementation(async (options) => {
        if (options?.types?.[0] === 'screen') {
          return [makeSource('screen:0', 'Screen 1') as any];
        }
        return [makeSource('window:1', 'Window 1') as any];
      });

      const handler = getHandler();
      const firstCall = handler({ id: 1 }, undefined);
      await flushMicrotasks();
      await firstCall;
      await flushMicrotasks();

      getSourcesMock.mockClear();
      const result = await handler({ id: 1 }, undefined);

      expect(result.map((s: SourceStub) => s.id)).toEqual(
        expect.arrayContaining(['screen:0', 'window:1'])
      );
    });

    it('kicks a background refresh of the stalest bucket when stale and cooldown elapsed', async () => {
      getSourcesMock.mockImplementation(async (options) => {
        if (options?.types?.[0] === 'screen') {
          return [makeSource('screen:0', 'Screen 1') as any];
        }
        return [makeSource('window:1', 'Window 1') as any];
      });

      const handler = getHandler();
      const firstCall = handler({ id: 1 }, undefined);
      await flushMicrotasks();
      await firstCall;
      await flushMicrotasks();

      const callsAfterFirst = getSourcesMock.mock.calls.length;

      // Advance beyond stale threshold (5000ms) and cooldown (4000ms).
      jest.advanceTimersByTime(5001);

      await handler({ id: 1 }, undefined);
      await flushMicrotasks();

      expect(getSourcesMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });
});
