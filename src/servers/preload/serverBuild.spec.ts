import { WEBVIEW_SERVER_BUILD_CHECK } from '../../ui/actions';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
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

      setServerBuildSignals({ buildId: 'abc', cacheVersion: 'v1' });

      expect(storeMock.dispatch).toHaveBeenCalledTimes(1);
      expect(storeMock.dispatch).toHaveBeenCalledWith({
        type: WEBVIEW_SERVER_BUILD_CHECK,
        payload: {
          url: 'https://example.rocket.chat/',
          buildId: 'abc',
          cacheVersion: 'v1',
        },
      });
    });
  });

  it('queues signal when store is not ready and dispatches on flush (Issue 1 fix)', () => {
    jest.isolateModules(() => {
      const storeMock = require('../../store');
      const { setServerBuildSignals, flushPendingBuildSignal } = require('./serverBuild');

      // Store not ready yet — setServerBuildSignals should NOT dispatch
      setServerBuildSignals({ buildId: 'queued-id', cacheVersion: undefined });
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
});
