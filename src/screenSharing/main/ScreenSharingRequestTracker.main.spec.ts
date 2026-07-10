import type { Event } from 'electron';
import { desktopCapturer, ipcMain } from 'electron';

import { ScreenSharingRequestTracker } from '../ScreenSharingRequestTracker';

jest.mock('electron', () => ({
  ipcMain: {
    once: jest.fn(),
    removeListener: jest.fn(),
  },
  desktopCapturer: {
    getSources: jest.fn(),
  },
}));

const onceMock = ipcMain.once as jest.MockedFunction<typeof ipcMain.once>;
const removeListenerMock = ipcMain.removeListener as jest.MockedFunction<
  typeof ipcMain.removeListener
>;
const getSourcesMock = desktopCapturer.getSources as jest.MockedFunction<
  typeof desktopCapturer.getSources
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

    it('queues a second request while one is pending instead of rejecting it', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const sendOpenPicker = jest.fn();

      tracker.createRequest(jest.fn(), sendOpenPicker);

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      expect(secondCb).not.toHaveBeenCalled();
      expect(secondSendOpenPicker).not.toHaveBeenCalled();
      // still only one listener registered (from the first request)
      expect(onceMock).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(true);
    });

    it('starts the queued request once the active one resolves', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      const firstListener = getRegisteredListener();
      firstListener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(onceMock).toHaveBeenCalledTimes(2);
      expect(secondSendOpenPicker).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(true);
      expect(secondCb).not.toHaveBeenCalled();
    });

    it('starts queued requests in FIFO order', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const order: string[] = [];

      tracker.createRequest(jest.fn(), () => order.push('first'));
      tracker.createRequest(jest.fn(), () => order.push('second'));
      tracker.createRequest(jest.fn(), () => order.push('third'));

      let listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('starts the next queued request once the active one times out', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);
      const firstCb = jest.fn();
      tracker.createRequest(firstCb, jest.fn());

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      jest.advanceTimersByTime(1000);

      expect(firstCb).toHaveBeenCalledWith(null);
      expect(secondSendOpenPicker).toHaveBeenCalledTimes(1);
      expect(secondCb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);

      // the queued request's own timeout starts fresh when it becomes active
      jest.advanceTimersByTime(999);
      expect(secondCb).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(secondCb).toHaveBeenCalledWith(null);
    });

    it('skips a queued request whose isStillValid returns false and starts the next one', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const staleCb = jest.fn();
      const staleOnDone = jest.fn();
      tracker.createRequest(staleCb, jest.fn(), {
        isStillValid: () => false,
        onDone: staleOnDone,
      });

      const thirdCb = jest.fn();
      const thirdSendOpenPicker = jest.fn();
      tracker.createRequest(thirdCb, thirdSendOpenPicker);

      const firstListener = getRegisteredListener();
      firstListener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(staleCb).toHaveBeenCalledWith(null);
      expect(staleOnDone).toHaveBeenCalledTimes(1);
      expect(thirdSendOpenPicker).toHaveBeenCalledTimes(1);
      expect(thirdCb).not.toHaveBeenCalled();
    });

    it('calls onDone when a request resolves, times out, or is cancelled', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL, 1000);

      const resolvedOnDone = jest.fn();
      tracker.createRequest(jest.fn(), jest.fn(), {
        onDone: resolvedOnDone,
      });
      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();
      expect(resolvedOnDone).toHaveBeenCalledTimes(1);

      const timeoutOnDone = jest.fn();
      tracker.createRequest(jest.fn(), jest.fn(), { onDone: timeoutOnDone });
      jest.advanceTimersByTime(1000);
      expect(timeoutOnDone).toHaveBeenCalledTimes(1);

      const cancelOnDone = jest.fn();
      const handle = tracker.createRequest(jest.fn(), jest.fn(), {
        onDone: cancelOnDone,
      });
      handle.cancel();
      expect(cancelOnDone).toHaveBeenCalledTimes(1);
    });

    it('queues a request that arrives while the active one is validating its source, and starts it once validation finishes', async () => {
      let resolveSources: (
        sources: Awaited<ReturnType<typeof desktopCapturer.getSources>>
      ) => void;
      getSourcesMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSources = resolve;
          })
      );

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const firstCb = jest.fn();
      tracker.createRequest(firstCb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(tracker.pending).toBe(true);
      expect(firstCb).not.toHaveBeenCalled();

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      expect(secondSendOpenPicker).not.toHaveBeenCalled();
      expect(secondCb).not.toHaveBeenCalled();
      expect(onceMock).toHaveBeenCalledTimes(1);

      resolveSources!([makeSource('screen:0')]);
      await flushPromises();

      expect(firstCb).toHaveBeenCalledWith({ video: makeSource('screen:0') });
      expect(secondSendOpenPicker).toHaveBeenCalledTimes(1);
      expect(secondCb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);
    });
  });

  describe('cancel', () => {
    it('cancels the active request, invoking cb and onDone, and starts the next queued request', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const firstCb = jest.fn();
      const firstOnDone = jest.fn();
      const handle = tracker.createRequest(firstCb, jest.fn(), {
        onDone: firstOnDone,
      });

      const secondCb = jest.fn();
      const secondSendOpenPicker = jest.fn();
      tracker.createRequest(secondCb, secondSendOpenPicker);

      handle.cancel();

      expect(firstCb).toHaveBeenCalledWith(null);
      expect(firstOnDone).toHaveBeenCalledTimes(1);
      expect(secondSendOpenPicker).toHaveBeenCalledTimes(1);
      expect(secondCb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);
    });

    it('removes a queued request without affecting the active request', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const firstCb = jest.fn();
      tracker.createRequest(firstCb, jest.fn());

      const queuedOnDone = jest.fn();
      const handle = tracker.createRequest(jest.fn(), jest.fn(), {
        onDone: queuedOnDone,
      });
      handle.cancel();

      expect(queuedOnDone).toHaveBeenCalledTimes(1);
      expect(firstCb).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(true);
      expect(onceMock).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when called after the request has already settled', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      const handle = tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();
      expect(cb).toHaveBeenCalledTimes(1);

      handle.cancel();
      handle.cancel();

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('cancelling while source validation is in flight settles once with no video, and the resolved validation does not settle again', async () => {
      let resolveSources: (
        sources: Awaited<ReturnType<typeof desktopCapturer.getSources>>
      ) => void;
      getSourcesMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSources = resolve;
          })
      );

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      const handle = tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(cb).not.toHaveBeenCalled();

      handle.cancel();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(null);

      resolveSources!([makeSource('screen:0')]);
      await flushPromises();

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('response listener', () => {
    it('resolves with the selected source when a valid sourceId is received', async () => {
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
      expect(cb).toHaveBeenCalledWith(null);
      expect(tracker.pending).toBe(false);
    });

    it('resolves with no video when the selected source is no longer available', async () => {
      getSourcesMock.mockResolvedValue([makeSource('window:1')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      listener(fakeEvent, 'screen:gone');
      await flushPromises();

      expect(cb).toHaveBeenCalledWith(null);
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

      expect(cb).toHaveBeenCalledWith(null);
      expect(tracker.pending).toBe(false);
    });

    it('ignores a response whose request id no longer matches (stale listener)', async () => {
      getSourcesMock.mockResolvedValue([makeSource('screen:0')]);

      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      tracker.createRequest(cb, jest.fn());

      const listener = getRegisteredListener();
      // cleanup settles the active entry with no video and clears activeRequestId,
      // so the stale listener call below early-returns without settling again
      tracker.cleanup();
      expect(cb).toHaveBeenCalledTimes(1);

      listener(fakeEvent, 'screen:0');
      await flushPromises();

      expect(cb).toHaveBeenCalledTimes(1);
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

      expect(cb).toHaveBeenCalledWith(null);
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

      // cleanup() settles the active entry synchronously with no video
      tracker.cleanup();
      expect(cb).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledTimes(1);
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
      expect(cb).toHaveBeenCalledWith(null);
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

    it('drains queued requests, invoking cb and onDone for each', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const queuedCb = jest.fn();
      const queuedOnDone = jest.fn();
      tracker.createRequest(jest.fn(), jest.fn(), { onDone: queuedOnDone });
      tracker.createRequest(queuedCb, jest.fn());

      tracker.cleanup();

      expect(queuedCb).toHaveBeenCalledWith(null);
      expect(queuedOnDone).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(false);
    });

    it('settles the active entry with no video and calls its onDone', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      const onDone = jest.fn();
      tracker.createRequest(cb, jest.fn(), { onDone });

      tracker.cleanup();

      expect(cb).toHaveBeenCalledWith(null);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('settles the active entry with no video and calls its onDone', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      const cb = jest.fn();
      const onDone = jest.fn();
      tracker.createRequest(cb, jest.fn(), { onDone });

      tracker.cancelAll();

      expect(cb).toHaveBeenCalledWith(null);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(tracker.pending).toBe(false);
    });

    it('drains queued entries, invoking cb and onDone for each', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const queuedCb = jest.fn();
      const queuedOnDone = jest.fn();
      tracker.createRequest(jest.fn(), jest.fn(), { onDone: queuedOnDone });
      tracker.createRequest(queuedCb, jest.fn());

      tracker.cancelAll();

      expect(queuedCb).toHaveBeenCalledWith(null);
      expect(queuedOnDone).toHaveBeenCalledTimes(1);
    });

    it('does not start the next queued request', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);
      tracker.createRequest(jest.fn(), jest.fn());

      const queuedCb = jest.fn();
      const queuedSendOpenPicker = jest.fn();
      tracker.createRequest(queuedCb, queuedSendOpenPicker);

      tracker.cancelAll();

      expect(onceMock).toHaveBeenCalledTimes(1);
      expect(queuedSendOpenPicker).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(false);
    });

    it('is a no-op when idle', () => {
      const tracker = new ScreenSharingRequestTracker(CHANNEL, LABEL);

      expect(() => tracker.cancelAll()).not.toThrow();
      expect(removeListenerMock).not.toHaveBeenCalled();
      expect(tracker.pending).toBe(false);
    });
  });
});
