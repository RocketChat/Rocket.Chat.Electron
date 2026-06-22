/**
 * Unit tests for the critical-error matcher and global error-handler setup in
 * src/errors.ts.
 *
 * `setupGlobalErrorHandlers` is guarded by a module-level `_globalHandlersBound`
 * flag, so each test that needs a fresh registration uses `jest.resetModules()`
 * + dynamic `import()` to reset that flag.
 *
 * `electron` and `./store` are mocked so the module under test does not touch
 * the real Electron app or the Redux store.
 */
import type * as ErrorsModuleType from '../../errors';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from '../../ui/actions';

type ErrorsModule = typeof ErrorsModuleType;

type ProcessEventHandler = (...args: unknown[]) => void;

const TEST_APP_VERSION = '4.13.0';

let appQuitMock: jest.Mock;
let bugsnagIsStartedMock: jest.Mock;
let bugsnagNotifyMock: jest.Mock;

const loadErrorsModule = async (): Promise<ErrorsModule> => {
  jest.resetModules();

  appQuitMock = jest.fn();
  bugsnagIsStartedMock = jest.fn(() => false);
  bugsnagNotifyMock = jest.fn();

  jest.doMock('electron', () => ({
    app: {
      quit: appQuitMock,
      getVersion: jest.fn(() => TEST_APP_VERSION),
    },
  }));

  jest.doMock('../../store', () => ({
    select: jest.fn(() => ({
      appVersion: TEST_APP_VERSION,
      isReportEnabled: false,
    })),
    listen: jest.fn(() => () => undefined),
  }));

  jest.doMock('@bugsnag/js', () => ({
    __esModule: true,
    default: {
      isStarted: bugsnagIsStartedMock,
      notify: bugsnagNotifyMock,
      start: jest.fn(() => ({
        startSession: jest.fn(),
        pauseSession: jest.fn(),
      })),
    },
  }));

  return import('../../errors');
};

/**
 * Registers the global error handlers and returns the captured process event
 * handlers keyed by event name. Uses a spy on `process.on` to intercept the
 * registrations performed by `setupMainErrorHandling`.
 */
const captureHandlers = async (): Promise<{
  errorsModule: ErrorsModule;
  handlers: Record<string, ProcessEventHandler>;
}> => {
  const errorsModule = await loadErrorsModule();
  const handlers: Record<string, ProcessEventHandler> = {};

  const onSpy = jest
    .spyOn(process, 'on')
    .mockImplementation((event: string | symbol, listener: any) => {
      if (event === 'uncaughtException' || event === 'unhandledRejection') {
        handlers[event as string] = listener;
      }
      return process;
    });

  await errorsModule.setupMainErrorHandling();

  onSpy.mockRestore();

  return { errorsModule, handlers };
};

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

describe('errors/setupMainErrorHandling', () => {
  it('registers uncaughtException and unhandledRejection handlers once', async () => {
    const errorsModule = await loadErrorsModule();
    const onSpy = jest
      .spyOn(process, 'on')
      .mockImplementation(() => process as any);

    await errorsModule.setupMainErrorHandling();

    const registeredEvents = onSpy.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain('uncaughtException');
    expect(registeredEvents).toContain('unhandledRejection');

    const callsAfterFirst = onSpy.mock.calls.length;

    // A second call must be a no-op because handlers are already bound.
    await errorsModule.setupMainErrorHandling();
    expect(onSpy.mock.calls.length).toBe(callsAfterFirst);
  });
});

describe('errors uncaughtException handler', () => {
  it('logs the error without quitting for a non-critical error', async () => {
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();

    handlers.uncaughtException(new Error('something minor'));

    expect(errorSpy).toHaveBeenCalledWith(
      'Uncaught Exception:',
      expect.any(Error)
    );
    expect(appQuitMock).not.toHaveBeenCalled();
  });

  it('quits the app when a critical pattern is in the message', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();

    handlers.uncaughtException(new Error('FATAL crash in render'));

    expect(appQuitMock).toHaveBeenCalledTimes(1);
  });

  it('quits the app when a critical pattern is in the stack', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();

    const error = new Error('innocuous message');
    error.stack = 'Error: innocuous message\n  at Electron internal error';

    handlers.uncaughtException(error);

    expect(appQuitMock).toHaveBeenCalledTimes(1);
  });

  it('notifies Bugsnag when it is started', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();
    bugsnagIsStartedMock.mockReturnValue(true);

    const error = new Error('reportable error');
    handlers.uncaughtException(error);

    expect(bugsnagNotifyMock).toHaveBeenCalledWith(error);
  });
});

describe('errors unhandledRejection handler', () => {
  it('wraps a non-Error reason into an Error and does not quit', async () => {
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();

    handlers.unhandledRejection('a plain string reason');

    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled Promise Rejection:',
      expect.any(Error)
    );
    const loggedError = errorSpy.mock.calls.find(
      (call) => call[0] === 'Unhandled Promise Rejection:'
    )?.[1] as Error;
    expect(loggedError.message).toContain('a plain string reason');
    expect(appQuitMock).not.toHaveBeenCalled();
  });

  it('quits the app when an Error reason matches a critical pattern', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();

    handlers.unhandledRejection(new Error('Cannot access native module foo'));

    expect(appQuitMock).toHaveBeenCalledTimes(1);
  });

  it('notifies Bugsnag for a rejection when it is started', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handlers } = await captureHandlers();
    bugsnagIsStartedMock.mockReturnValue(true);

    handlers.unhandledRejection(new Error('reportable rejection'));

    expect(bugsnagNotifyMock).toHaveBeenCalledTimes(1);
  });
});

describe('errors/setCriticalErrorMatcher', () => {
  it('uses a custom matcher that classifies an error as critical', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { errorsModule, handlers } = await captureHandlers();

    const restore = errorsModule.setCriticalErrorMatcher(
      (error) => error.message === 'custom-critical'
    );

    handlers.uncaughtException(new Error('custom-critical'));
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    restore();
  });

  it('uses a custom matcher that classifies an error as non-critical', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { errorsModule, handlers } = await captureHandlers();

    // Without the custom matcher this message would match the default FATAL
    // pattern; the custom matcher overrides that and returns false.
    const restore = errorsModule.setCriticalErrorMatcher(() => false);

    handlers.uncaughtException(new Error('FATAL but overridden'));
    expect(appQuitMock).not.toHaveBeenCalled();

    restore();
  });

  it('restores the previous matcher when the cleanup function is called', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { errorsModule, handlers } = await captureHandlers();

    const restore = errorsModule.setCriticalErrorMatcher(() => false);
    restore();

    // After restore, the default FATAL pattern matching applies again.
    handlers.uncaughtException(new Error('FATAL crash'));
    expect(appQuitMock).toHaveBeenCalledTimes(1);
  });

  it('falls through to the default matcher when the custom matcher throws', async () => {
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { errorsModule, handlers } = await captureHandlers();

    const restore = errorsModule.setCriticalErrorMatcher(() => {
      throw new Error('matcher exploded');
    });

    handlers.uncaughtException(new Error('FATAL crash'));

    expect(errorSpy).toHaveBeenCalledWith(
      'Critical error matcher failed:',
      expect.any(Error)
    );
    // Default behavior still applies after the matcher throws.
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    restore();
  });

  it('resets to the default matcher when passed null', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { errorsModule, handlers } = await captureHandlers();

    const restore = errorsModule.setCriticalErrorMatcher(() => false);
    errorsModule.setCriticalErrorMatcher(null);

    handlers.uncaughtException(new Error('FATAL crash'));
    expect(appQuitMock).toHaveBeenCalledTimes(1);

    restore();
  });
});

describe('errors/setupRendererErrorHandling', () => {
  it('returns without error when BUGSNAG_API_KEY is not set', async () => {
    const errorsModule = await loadErrorsModule();
    const original = process.env.BUGSNAG_API_KEY;
    delete process.env.BUGSNAG_API_KEY;

    await expect(
      errorsModule.setupRendererErrorHandling('main')
    ).resolves.toBeUndefined();

    if (original !== undefined) {
      process.env.BUGSNAG_API_KEY = original;
    }
  });

  it('registers a settings listener when reporting is enabled', async () => {
    jest.resetModules();
    const original = process.env.BUGSNAG_API_KEY;
    process.env.BUGSNAG_API_KEY = '12345678901234567890123456789012';

    appQuitMock = jest.fn();
    const listenMock = jest.fn(() => () => undefined);
    const startSessionMock = jest.fn();

    jest.doMock('electron', () => ({
      app: { quit: appQuitMock, getVersion: jest.fn(() => TEST_APP_VERSION) },
    }));
    jest.doMock('../../store', () => ({
      select: jest.fn(() => ({
        appVersion: TEST_APP_VERSION,
        isReportEnabled: true,
      })),
      listen: listenMock,
    }));
    jest.doMock('@bugsnag/js', () => ({
      __esModule: true,
      default: {
        isStarted: jest.fn(() => false),
        notify: jest.fn(),
        start: jest.fn(() => ({
          startSession: startSessionMock,
          pauseSession: jest.fn(),
        })),
      },
    }));

    const errorsModule: ErrorsModule = await import('../../errors');
    await errorsModule.setupRendererErrorHandling('rootWindow');

    expect(listenMock).toHaveBeenCalledWith(
      SETTINGS_SET_REPORT_OPT_IN_CHANGED,
      expect.any(Function)
    );

    if (original !== undefined) {
      process.env.BUGSNAG_API_KEY = original;
    } else {
      delete process.env.BUGSNAG_API_KEY;
    }
  });
});
