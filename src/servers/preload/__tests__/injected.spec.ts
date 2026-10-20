/* eslint-disable @typescript-eslint/no-var-requires -- injected.ts runs on
   import, so each test loads a fresh copy inside jest.isolateModules */

describe('injected.ts', () => {
  const originalRequire = window.require;
  const originalDesktop = window.RocketChatDesktop;
  let reloadServer: jest.Mock;

  const setWindowRequire = (value: unknown) =>
    Object.defineProperty(window, 'require', {
      value,
      configurable: true,
      writable: true,
    });

  const loadInjected = () => {
    window.RocketChatDesktop = {
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

  it('never reloads when window.require never appears', async () => {
    loadInjected();

    await jest.advanceTimersByTimeAsync(60_000);

    expect(reloadServer).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('replaces Notification even when window.require never appears', () => {
    const nativeNotification = window.Notification;
    try {
      loadInjected();

      expect(window.Notification).not.toBe(nativeNotification);
      expect(window.Notification.permission).toBe('granted');
    } finally {
      window.Notification = nativeNotification;
    }
  });

  describe('module paths across server versions', () => {
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
          target[property] ??= jest.fn();
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

    it('pushes the unreadAlert preference of the user to the preload badge', async () => {
      loadWithModules({
        '/rocketchat.info': { Info: { version: '8.10.0' } },
        'meteor/meteor': {
          Meteor: {
            userId: () => 'user',
            status: () => ({ connected: true }),
            user: () => ({ settings: { preferences: { unreadAlert: false } } }),
          },
        },
        'meteor/tracker': { Tracker: { autorun: (fn: () => void) => fn() } },
      });

      await jest.advanceTimersByTimeAsync(2_000);

      expect(desktop.setUnreadAlertEnabled).toHaveBeenLastCalledWith(false);
      // The Meteor login autorun stays: it also covers routes outside the
      // main layout, where the web client fires no login event.
      expect(desktop.setUserLoggedIn).toHaveBeenLastCalledWith(true);
    });

    it('keeps the app/utils path and the Tracker-reactive settings get on servers before 7.11', async () => {
      const values: Record<string, unknown> = {
        Assets_favicon: { url: 'custom.png', defaultUrl: 'favicon.svg' },
        Site_Name: 'Legacy',
      };
      loadWithModules({
        '/app/utils/rocketchat.info': { Info: { version: '7.10.15' } },
        '/app/settings/client/index.ts': {
          settings: { get: (key: string) => values[key] },
        },
        'meteor/tracker': { Tracker: { autorun: (fn: () => void) => fn() } },
      });

      await jest.advanceTimersByTimeAsync(2_000);

      expect(reloadServer).not.toHaveBeenCalled();
      expect(desktop.setServerInfo).toHaveBeenCalledWith({
        version: '7.10.15',
      });
      expect(desktop.setFavicon).toHaveBeenLastCalledWith('custom.png');
      expect(desktop.setTitle).toHaveBeenLastCalledWith('Legacy');
    });
  });
});
