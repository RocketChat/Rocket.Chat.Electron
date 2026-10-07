/* eslint-disable @typescript-eslint/no-var-requires -- injected.ts runs on
   import, so each test loads a fresh copy inside jest.isolateModules */

const BOOT_RECOVERY_ATTEMPTS_KEY = 'rocketChatDesktopBootRecoveryAttempts';

describe('injected.ts boot recovery', () => {
  const originalRequire = window.require;
  const originalDesktop = window.RocketChatDesktop;
  let reloadServer: jest.Mock;

  const setWindowRequire = (value: unknown) =>
    Object.defineProperty(window, 'require', {
      value,
      configurable: true,
      writable: true,
    });

  const loadInjected = (isUiPreviewActive: () => boolean) => {
    window.RocketChatDesktop = {
      isUiPreviewActive,
      reloadServer,
    } as unknown as Window['RocketChatDesktop'];
    jest.isolateModules(() => {
      require('../../../injected');
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    reloadServer = jest.fn();
    window.sessionStorage.clear();
    setWindowRequire(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    window.sessionStorage.clear();
    setWindowRequire(originalRequire);
    window.RocketChatDesktop = originalDesktop;
  });

  it('skips the retries and the cache-clearing reload while a UI preview runs', async () => {
    loadInjected(() => true);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(reloadServer).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)).toBe(
      null
    );
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('still recovers a server UI that never exposes window.require', async () => {
    loadInjected(() => false);

    await jest.advanceTimersByTimeAsync(29_000);
    expect(reloadServer).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(2_000);
    expect(reloadServer).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)).toBe('1');
  });

  it('asks again on every retry, so a store that was not ready yet still counts', async () => {
    const isUiPreviewActive = jest
      .fn<boolean, []>()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    loadInjected(isUiPreviewActive);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(isUiPreviewActive).toHaveBeenCalledTimes(2);
    expect(reloadServer).not.toHaveBeenCalled();
  });
});
