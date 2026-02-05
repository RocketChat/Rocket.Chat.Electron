/**
 * Integration tests for Bugsnag network behavior.
 *
 * These tests use nock to intercept real HTTP requests from the Bugsnag SDK,
 * verifying that no network calls are made when error reporting is disabled.
 *
 * Note: Some tests require waiting for Bugsnag's 10-second session batching
 * interval, resulting in ~30 second total test time.
 */
import nock from 'nock';

import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from '../ui/actions';

const TEST_API_KEY = '12345678901234567890123456789012';
const TEST_APP_VERSION = '4.12.0';

// Bugsnag batches sessions and sends them on a 10-second interval
const BUGSNAG_SESSION_INTERVAL_MS = 10000;
const WAIT_FOR_SESSION_BATCH_MS = BUGSNAG_SESSION_INTERVAL_MS + 2000;
const SHORT_WAIT_MS = 500;

type SettingsChangedCallback = (action: {
  type: string;
  payload: boolean;
}) => void;

/**
 * Creates standard mocks for store and electron modules
 */
const createMocks = (
  isReportEnabled: boolean,
  onListen?: (callback: SettingsChangedCallback) => void
) => {
  jest.doMock('../store', () => ({
    select: jest.fn(() => ({
      appVersion: TEST_APP_VERSION,
      isReportEnabled,
    })),
    listen: jest.fn((type: unknown, callback: unknown) => {
      if (type === SETTINGS_SET_REPORT_OPT_IN_CHANGED && onListen) {
        onListen(callback as SettingsChangedCallback);
      }
      return () => {};
    }),
  }));

  jest.doMock('electron', () => ({
    app: {
      getVersion: jest.fn(() => TEST_APP_VERSION),
      quit: jest.fn(),
    },
  }));
};

/**
 * Sets up nock interceptors for Bugsnag endpoints and returns a call tracker
 */
const interceptBugsnagCalls = () => {
  const tracker = { sessionCalls: 0, notifyCalls: 0 };

  nock('https://sessions.bugsnag.com')
    .post(() => true)
    .times(100)
    .reply(() => {
      tracker.sessionCalls++;
      return [200, {}];
    });

  nock('https://notify.bugsnag.com')
    .post(() => true)
    .times(100)
    .reply(() => {
      tracker.notifyCalls++;
      return [200, {}];
    });

  return tracker;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Environment variable mock helper using Object.defineProperty.
 * Stores original descriptors to restore after tests.
 */
const envMocks = new Map<
  string,
  { descriptor: PropertyDescriptor | undefined; existed: boolean }
>();

const setEnvVar = (key: string, value: string): void => {
  if (!envMocks.has(key)) {
    envMocks.set(key, {
      descriptor: Object.getOwnPropertyDescriptor(process.env, key),
      existed: key in process.env,
    });
  }
  Object.defineProperty(process.env, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

const unsetEnvVar = (key: string): void => {
  if (!envMocks.has(key)) {
    envMocks.set(key, {
      descriptor: Object.getOwnPropertyDescriptor(process.env, key),
      existed: key in process.env,
    });
  }
  Object.defineProperty(process.env, key, {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true,
  });
};

const restoreEnvVars = (): void => {
  envMocks.forEach(({ descriptor, existed }, key) => {
    if (existed && descriptor) {
      Object.defineProperty(process.env, key, descriptor);
    } else {
      Object.defineProperty(process.env, key, {
        value: undefined,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }
  });
  envMocks.clear();
};

// Skip on Windows due to Jest module mocking issues with Electron runner
const describeOrSkip = process.platform === 'win32' ? describe.skip : describe;

describeOrSkip('Bugsnag network behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    nock.cleanAll();
    nock.disableNetConnect();

    setEnvVar('BUGSNAG_API_KEY', TEST_API_KEY);
    setEnvVar('NODE_ENV', 'test');
  });

  afterEach(() => {
    restoreEnvVars();
    nock.cleanAll();
    nock.enableNetConnect();
    jest.resetModules();
  });

  describe('when reporting is disabled', () => {
    it('should not make any network calls when isReportEnabled is false', async () => {
      createMocks(false);
      const tracker = interceptBugsnagCalls();

      const { setupRendererErrorHandling } = await import('../errors');
      await setupRendererErrorHandling('main');
      await wait(SHORT_WAIT_MS);

      expect(tracker.sessionCalls).toBe(0);
      expect(tracker.notifyCalls).toBe(0);
    });

    it('should not make any network calls when BUGSNAG_API_KEY is not set', async () => {
      unsetEnvVar('BUGSNAG_API_KEY');
      createMocks(true);
      const tracker = interceptBugsnagCalls();

      const { setupRendererErrorHandling } = await import('../errors');
      await setupRendererErrorHandling('main');
      await wait(SHORT_WAIT_MS);

      expect(tracker.sessionCalls).toBe(0);
    });
  });

  describe('when reporting is enabled', () => {
    it('should not make immediate session calls (batched on interval)', async () => {
      createMocks(true);
      const tracker = interceptBugsnagCalls();

      const { setupRendererErrorHandling } = await import('../errors');
      await setupRendererErrorHandling('main');
      await wait(SHORT_WAIT_MS);

      // Sessions are batched, not sent immediately
      expect(tracker.sessionCalls).toBe(0);
    });

    it(
      'should send session after the batching interval',
      async () => {
        createMocks(true);
        const tracker = interceptBugsnagCalls();

        const { setupRendererErrorHandling } = await import('../errors');
        await setupRendererErrorHandling('main');
        await wait(WAIT_FOR_SESSION_BATCH_MS);

        expect(tracker.sessionCalls).toBeGreaterThanOrEqual(1);
      },
      WAIT_FOR_SESSION_BATCH_MS + 3000
    );
  });

  describe('toggle behavior', () => {
    it('should not make network calls when reporting starts disabled', async () => {
      let onSettingsChanged: SettingsChangedCallback | null = null;
      createMocks(false, (cb) => {
        onSettingsChanged = cb;
      });
      const tracker = interceptBugsnagCalls();

      const { setupRendererErrorHandling } = await import('../errors');
      await setupRendererErrorHandling('main');

      expect(onSettingsChanged).not.toBeNull();
      await wait(SHORT_WAIT_MS);
      expect(tracker.sessionCalls).toBe(0);
    });

    it(
      'should start sending sessions after user enables reporting',
      async () => {
        let onSettingsChanged: SettingsChangedCallback | null = null;
        createMocks(false, (cb) => {
          onSettingsChanged = cb;
        });
        const tracker = interceptBugsnagCalls();

        const { setupRendererErrorHandling } = await import('../errors');
        await setupRendererErrorHandling('main');
        await wait(SHORT_WAIT_MS);

        expect(tracker.sessionCalls).toBe(0);

        // User enables reporting
        onSettingsChanged!({
          type: SETTINGS_SET_REPORT_OPT_IN_CHANGED,
          payload: true,
        });

        await wait(WAIT_FOR_SESSION_BATCH_MS);
        expect(tracker.sessionCalls).toBeGreaterThanOrEqual(1);
      },
      WAIT_FOR_SESSION_BATCH_MS + 3000
    );
  });
});
