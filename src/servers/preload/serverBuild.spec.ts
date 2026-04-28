import { WEBVIEW_SERVER_BUILD_CHECK } from '../../ui/actions';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
  safeSelect: jest.fn(() => [{ url: 'https://example.rocket.chat/' }]),
}));

jest.mock('./urls', () => ({
  getServerUrl: jest.fn(() => 'https://example.rocket.chat/'),
}));

// Re-import fresh module state for each test group via jest.isolateModules.

describe('setServerBuildSignals / flushPendingBuildSignal', () => {
  beforeEach(() => {
    jest.resetModules();
    // Reset mock state
    const storeMock = require('../../store');
    storeMock.dispatch.mockClear();
  });

  it('dispatches immediately when store is already ready', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      // Mark store as ready first
      flushPendingBuildSignal();
      storeMock.dispatch.mockClear();

      setServerBuildSignals({ buildId: 'abc', cacheVersion: 'v1', buildIdSource: 'commit' });

      expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
      expect(storeMock.dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_SERVER_BUILD_CHECK,
        payload: {
          url: 'https://example.rocket.chat/',
          buildId: 'abc',
          cacheVersion: 'v1',
          buildIdSource: 'commit',
        },
      });
    });
  });

  it('forwards buildIdSource=version in dispatched payload', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      flushPendingBuildSignal();
      storeMock.dispatch.mockClear();

      setServerBuildSignals({ buildId: '7.5.0', cacheVersion: undefined, buildIdSource: 'version' });

      expect(storeMock.dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_SERVER_BUILD_CHECK,
        payload: {
          url: 'https://example.rocket.chat/',
          buildId: '7.5.0',
          cacheVersion: undefined,
          buildIdSource: 'version',
        },
      });
    });
  });

  it('forwards buildIdSource=autoupdate in dispatched payload', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      flushPendingBuildSignal();
      storeMock.dispatch.mockClear();

      setServerBuildSignals({ buildId: 'bundle-abc.def', cacheVersion: undefined, buildIdSource: 'autoupdate' });

      expect(storeMock.dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_SERVER_BUILD_CHECK,
        payload: {
          url: 'https://example.rocket.chat/',
          buildId: 'bundle-abc.def',
          cacheVersion: undefined,
          buildIdSource: 'autoupdate',
        },
      });
    });
  });

  it('queues signal when store is not ready and dispatches on flush (Issue 1 fix)', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      // Store not ready yet — setServerBuildSignals should NOT dispatch
      setServerBuildSignals({ buildId: 'queued-id', cacheVersion: undefined, buildIdSource: 'commit' });
      expect(storeMock.dispatch).not.toHaveBeenCalled();

      // Now flush — should dispatch the queued signal
      flushPendingBuildSignal();
      expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
      expect(storeMock.dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_SERVER_BUILD_CHECK,
        payload: {
          url: 'https://example.rocket.chat/',
          buildId: 'queued-id',
          cacheVersion: undefined,
          buildIdSource: 'commit',
        },
      });
    });
  });

  it('only retains the most recent signal when called multiple times before flush', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      setServerBuildSignals({ buildId: 'first', cacheVersion: undefined });
      setServerBuildSignals({ buildId: 'second', cacheVersion: 'v2' });

      expect(storeMock.dispatch).not.toHaveBeenCalled();

      flushPendingBuildSignal();
      expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
      expect(storeMock.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ buildId: 'second', cacheVersion: 'v2' }),
        })
      );
    });
  });

  it('does nothing when flush is called with no pending signal', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { flushPendingBuildSignal } = require('./serverBuild');

      flushPendingBuildSignal();
      expect(storeMock.dispatch).not.toHaveBeenCalled();
    });
  });

  it('does not dispatch when both buildId and cacheVersion are absent', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      flushPendingBuildSignal(); // mark ready
      storeMock.dispatch.mockClear();

      setServerBuildSignals({ buildId: undefined, cacheVersion: undefined });
      expect(storeMock.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('multi-slot queue (H3)', () => {
    it('queues commit and autoupdate separately; both dispatched on flush in order', () => {
      jest.isolateModules(() => {
        const storeMock = require('../../store');
        const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

        // Store not ready — queue two different-source signals
        setServerBuildSignals({ buildId: 'abc123', buildIdSource: 'commit' });
        setServerBuildSignals({ buildId: 'bundle-xyz', buildIdSource: 'autoupdate' });
        expect(storeMock.dispatch).not.toHaveBeenCalled();

        flushPendingBuildSignal();
        expect(storeMock.dispatch).toHaveBeenCalledTimes(2);

        // commit dispatched first
        expect(storeMock.dispatch).toHaveBeenNthCalledWith(1,
          expect.objectContaining({
            type: WEBVIEW_SERVER_BUILD_CHECK,
            payload: expect.objectContaining({ buildId: 'abc123', buildIdSource: 'commit' }),
          })
        );
        // autoupdate dispatched second
        expect(storeMock.dispatch).toHaveBeenNthCalledWith(2,
          expect.objectContaining({
            type: WEBVIEW_SERVER_BUILD_CHECK,
            payload: expect.objectContaining({ buildId: 'bundle-xyz', buildIdSource: 'autoupdate' }),
          })
        );
      });
    });

    it('most-recent-wins within the same slot: second commit overwrites first', () => {
      jest.isolateModules(() => {
        const storeMock = require('../../store');
        const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

        setServerBuildSignals({ buildId: 'first-commit', buildIdSource: 'commit' });
        setServerBuildSignals({ buildId: 'second-commit', buildIdSource: 'commit' });
        expect(storeMock.dispatch).not.toHaveBeenCalled();

        flushPendingBuildSignal();
        expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
        expect(storeMock.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({ buildId: 'second-commit', buildIdSource: 'commit' }),
          })
        );
      });
    });

    it('cacheVersion-only slot is separate from commit slot', () => {
      jest.isolateModules(() => {
        const storeMock = require('../../store');
        const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

        setServerBuildSignals({ buildId: 'abc123', buildIdSource: 'commit' });
        setServerBuildSignals({ cacheVersion: 'cv3' });
        expect(storeMock.dispatch).not.toHaveBeenCalled();

        flushPendingBuildSignal();
        // Both slots should flush independently
        expect(storeMock.dispatch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('server-record-ready gate (C2)', () => {
    it('holds signal when store ready but server not in registry, dispatches after server appears', () => {
      jest.useFakeTimers();
      jest.isolateModules(() => {
        const storeMock = require('../../store');
        // Initially server NOT in registry
        storeMock.safeSelect.mockReturnValue([]);
        const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

        flushPendingBuildSignal(); // store ready
        storeMock.dispatch.mockClear();

        setServerBuildSignals({ buildId: 'abc', buildIdSource: 'commit' });
        // Server not ready — should not dispatch yet
        expect(storeMock.dispatch).not.toHaveBeenCalled();

        // Now server appears in registry
        storeMock.safeSelect.mockReturnValue([{ url: 'https://example.rocket.chat/' }]);

        jest.advanceTimersByTime(300);
        expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
        expect(storeMock.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({ buildId: 'abc', buildIdSource: 'commit' }),
          })
        );
      });
      jest.useRealTimers();
    });
  });
});
