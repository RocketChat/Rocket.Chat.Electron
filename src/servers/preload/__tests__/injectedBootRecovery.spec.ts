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

  describe('on a server that keeps rocketchat.info at the app root (8.10+)', () => {
    let desktop: Record<string, jest.Mock>;

    const loadWithModules = (modules: Record<string, unknown>) => {
      setWindowRequire((path: string) => {
        if (!(path in modules)) {
          throw new Error(`Cannot find module '${path}'`);
        }
        return modules[path];
      });
      desktop = {};
      window.RocketChatDesktop = new Proxy(desktop, {
        get: (target, property: string) => {
          target[property] ??= jest.fn(() =>
            property === 'isUiPreviewActive' ? false : undefined
          );
          return target[property];
        },
      }) as unknown as Window['RocketChatDesktop'];
      jest.isolateModules(() => {
        require('../../../injected');
      });
    };

    const createSettingsStore = (values: Record<string, unknown>) => {
      const observers = new Map<
        string,
        (key: string, value: unknown) => void
      >();
      return {
        peek: (key: string) => values[key],
        observe: (key: string, callback: (k: string, v: unknown) => void) => {
          observers.set(key, callback);
          return () => observers.delete(key);
        },
        change: (key: string, value: unknown) =>
          observers.get(key)?.(key, value),
      };
    };

    it('routes clipboard writes to the main process even when the boot gives up', async () => {
      const nativeWriteText = navigator.clipboard.writeText;
      try {
        loadWithModules({});

        await navigator.clipboard.writeText('copied');

        expect(desktop.writeTextToClipboard).toHaveBeenCalledWith('copied');
      } finally {
        navigator.clipboard.writeText = nativeWriteText;
      }
    });

    it('reads the server version without a recovery reload', async () => {
      loadWithModules({
        '/rocketchat.info': { Info: { version: '8.10.0-develop' } },
      });

      await jest.advanceTimersByTimeAsync(60_000);

      expect(reloadServer).not.toHaveBeenCalled();
      expect(desktop.setServerInfo).toHaveBeenCalledWith({
        version: '8.10.0-develop',
      });
    });

    it('follows the favicon and site name through the peek and observe settings store', async () => {
      const settings = createSettingsStore({
        Assets_favicon: { defaultUrl: 'favicon.svg' },
        Site_Name: 'Open',
      });
      loadWithModules({
        '/rocketchat.info': { Info: { version: '8.10.0' } },
        '/client/lib/settings/index.ts': { settings },
        'meteor/tracker': { Tracker: { autorun: (fn: () => void) => fn() } },
      });

      await jest.advanceTimersByTimeAsync(2_000);
      expect(desktop.setFavicon).toHaveBeenLastCalledWith('favicon.svg');
      expect(desktop.setTitle).toHaveBeenLastCalledWith('Open');

      settings.change('Site_Name', 'Renamed');
      expect(desktop.setTitle).toHaveBeenLastCalledWith('Renamed');
    });
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
