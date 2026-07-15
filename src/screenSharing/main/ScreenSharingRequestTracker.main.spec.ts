import type { Event } from 'electron';
import { desktopCapturer, ipcMain } from 'electron';

import { ScreenSharingRequestTracker } from '../ScreenSharingRequestTracker';
import { getCachedSources } from '../desktopCapturerCache';

jest.mock('electron', () => ({
  ipcMain: {
    once: jest.fn(),
    removeListener: jest.fn(),
  },
  desktopCapturer: {
    getSources: jest.fn(),
  },
}));

jest.mock('../desktopCapturerCache', () => ({
  getCachedSources: jest.fn(),
}));

const onceMock = ipcMain.once as jest.MockedFunction<typeof ipcMain.once>;
const removeListenerMock = ipcMain.removeListener as jest.MockedFunction<
  typeof ipcMain.removeListener
>;
const getSourcesMock = desktopCapturer.getSources as jest.MockedFunction<
  typeof desktopCapturer.getSources
>;
const getCachedSourcesMock = getCachedSources as jest.MockedFunction<
  typeof getCachedSources
>;

const CHANNEL = 'screen-share:response';
const LABEL = 'TestPicker';

type ResponseListener = (event: Event, sourceId: string | null) => void;

const fakeEvent = {} as Event;

const makeSource = (id: string) => ({ id, name: id }) as any;

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const getRegisteredListener = (): ResponseListener => {
  const lastCall = onceMock.mock.calls[onceMock.mock.calls.length - 1];
  expect(lastCall[0]).toBe(CHANNEL);
  return lastCall[1] as ResponseListener;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Every createRequest() schedules a real setTimeout (default 60s). Tests that
  // neither fire the response listener nor call cleanup would leak a live,
  // ref'd timer that keeps the process alive and blocks jest --forceExit. Fake
  // timers make those handles fake; clearAllTimers in afterEach disposes them.
  // setImmediate is left real so flushPromises() (used by the async response
  // listener tests) still resolves without manual timer advancement.
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  // Default: empty cache, so pre-existing tests that don't care about the
  // cache path exercise the same direct-getSources fallback they did before.
  getCachedSourcesMock.mockReturnValue([]);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ScreenSharingRequestTracker', () => {
  describe('createRequest', () => {
    it('registers a listener on the response channel and opens the picker', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      const sendOpenPicker = jest.fn();

      tracker.createRequest(cb, sendOpenPicker);

      expect(onceMock).toHaveBeenCalledTimes(1);
      expect(onceMock).toHaveBeenCalledWith(CHANNEL, expect.any(Function));
      expect(sendOpenPicker).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('starts not pending before any request', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      expect(tracker.pending).toBe(false);
    });

    it('ignores a duplicate request while one is pending and invokes cb with no video', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const sendOpenPicker = jest.fn();

      tracker.createRequest(jest.fn(), sendOpenPicker);

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      expect(secondCb).toHaveBeenCalledWith({ video: false });
      expect(secondSendOpenPicker).not.toHaveBeenCalled();
      // still only one listener registered (from the first request)
      expect(onceMock).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(true);
    });
  });

  describe('response listener', () => {
    it('resolves from the cache without calling getSources when the cache is non-empty', async () => {
      getCachedSourcesMock.mockReturnValue([
        makeSource('window:1'),
        makeSource('screen:0'),
      ]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(getSourcesMock).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith({ video: makeSource('screen:0') });
      expect(tracker.pending).toBe(false);
      expect(removeListenerMock).toHaveBeenCalledWith(CHANNEL, listener);
    });

    it('denies when the sourceId is missing from a non-empty cache, without calling getSources', async () => {
      getCachedSourcesMock.mockReturnValue([makeSource('window:1')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:gone');
      await flushPromises();

      expect(getSourcesMock).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith({ video: false });
      expect(tracker.pending).toBe(false);
    });

    it('falls back to a single direct getSources call when the cache is empty', async () => {
      getCachedSourcesMock.mockReturnValue([]);
      getSourcesMock.mockResolvedValue([
        makeSource('window:1'),
        makeSource('screen:0'),
      ]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(getSourcesMock).toHaveBeenCalledTimes(1);
      expect(getSourcesMock).toHaveBeenCalledWith({
        types: ['window', 'screen'],
      });
      expect(cb).toHaveBeenCalledWith({ video: makeSource('screen:0') });
      expect(tracker.pending).toBe(false);
      expect(removeListenerMock).toHaveBeenCalledWith(CHANNEL, listener);
    });

    it('resolves with no video when sourceId is null (user cancelled)', async () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, null);
      await flushPromises();

      expect(getSourcesMock).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith({ video: false });
      expect(tracker.pending).toBe(false);
    });

    it('resolves with no video via the fallback getSources call when the selected source is no longer available', async () => {
      getSourcesMock.mockResolvedValue([makeSource('window:1')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:gone');
      await flushPromises();

      expect(cb).toHaveBeenCalledWith({ video: false });
      expect(tracker.pending).toBe(false);
    });

    it('resolves with no video when desktopCapturer.getSources throws', async () => {
      getSourcesMock.mockRejectedValue(new Error('capture failed'));

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(cb).toHaveBeenCalledWith({ video: false });
      expect(tracker.pending).toBe(false);
    });

    it('ignores a response whose request id no longer matches (stale listener)', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      // cleanup clears activeRequestId, so listener early-returns
      tracker.cleanup();

      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(cb).not.toHaveBeenCalled();
      expect(getSourcesMock).not.toHaveBeenCalled();
    });

    it('ignores a second response after the first has been handled', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();
      expect(cb).toHaveBeenCalledTimes(1);

      listener(fakeEvent, 'screen:0');
      await flushPromises();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('resolves with no video after the timeout elapses', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      expect(cb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);

      jest.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledWith({ video: false });
      expect(tracker.pending).toBe(false);
      expect(removeListenerMock).toHaveBeenCalledWith(
        CHANNEL,
        expect.any(Function)
      );
    });

    it('does not fire the timeout before it elapses', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      jest.advanceTimersByTime(999);

      expect(cb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);
    });

    it('does not fire the timeout for a request that was cleaned up', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      tracker.cleanup();
      jest.advanceTimersByTime(1000);

      expect(cb).not.toHaveBeenCalled();
    });

    it('does not double-resolve when the timeout fires after a response was handled', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      // microtasks inside the async listener must settle before timers fire
      await Promise.resolve();
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(1);

      // the timeout still exists in fake-timer queue; advancing must not re-fire cb
      jest.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('uses the default timeout when none is provided', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      jest.advanceTimersByTime(59999);
      expect(cb).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledWith({ video: false });
    });
  });

  describe('cleanup', () => {
    it('removes the active listener and clears pending state', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const listener = getRegisteredListener();
      tracker.cleanup();

      expect(removeListenerMock).toHaveBeenCalledWith(CHANNEL, listener);
      expect(tracker.pending).toBe(false);
    });

    it('is a no-op when there is no active request', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);

      expect(() => tracker.cleanup()).not.toThrow();
      expect(removeListenerMock).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(false);
    });

    it('allows a new request after cleanup', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());
      tracker.cleanup();

      const cb = jest.fn();
      const sendOpenPicker = jest.fn();
      tracker.createRequest(cb, sendOpenPicker);

      expect(sendOpenPicker).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('cleans up the previous listener when a fresh request follows a completed one', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());
      const firstListener = getRegisteredListener();
      firstListener(fakeEvent, 'screen:0');
      await flushPromises();
      expect(tracker.pending).toBe(false);

      // new request: createRequest calls cleanup() internally first
      tracker.createRequest(jest.fn(), jest.fn());
      expect(tracker.pending).toBe(true);
      expect(onceMock).toHaveBeenCalledTimes(2);
    });
  });
});
