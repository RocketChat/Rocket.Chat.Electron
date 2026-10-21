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
      const requireMock = jest.fn((path: string) => {
        if (!(path in modules)) {
          throw new Error(`Cannot find module '${path}'`);
        }
        return modules[path];
      });
      setWindowRequire(requireMock);
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
      return requireMock;
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

    describe('setup check', () => {
      const tracker = { Tracker: { autorun: (fn: () => void) => fn() } };
      const meteor = {
        Meteor: {
          absoluteUrl: () => 'https://open.example/',
          userId: () => 'user',
          status: () => ({ connected: true, status: 'connected' }),
          user: () => ({}),
          loggingIn: () => false,
          call: () => undefined,
        },
      };
      const session = { Session: { get: () => 0 } };
      const presence = {
        Presence: {
          store: new Map(),
          listen: () => undefined,
          get: () => Promise.resolve(undefined),
          stop: () => undefined,
        },
      };

      // Advances the clock and returns the window.require calls made in it.
      const countRequireCallsIn = async (
        requireMock: jest.Mock,
        milliseconds: number
      ) => {
        const before = requireMock.mock.calls.length;
        await jest.advanceTimersByTimeAsync(milliseconds);
        return requireMock.mock.calls.length - before;
      };

      it('stops once every feature of an 8.10 server is set up', async () => {
        const requireMock = loadWithModules({
          '/rocketchat.info': { Info: { version: '8.10.0' } },
          'meteor/meteor': meteor,
          'meteor/session': session,
          'meteor/tracker': tracker,
          '/client/lib/settings/index.ts': {
            settings: createSettingsStore({ Site_Name: 'Open' }),
          },
          '/client/lib/presence.ts': presence,
        });

        await jest.advanceTimersByTimeAsync(2_000);

        expect(desktop.setTitle).toHaveBeenLastCalledWith('Open');
        expect(desktop.setUnreadAlertEnabled).toHaveBeenLastCalledWith(true);
        expect(desktop.setUserLoggedIn).toHaveBeenLastCalledWith(true);
        expect(desktop.setUserPresence).toHaveBeenCalled();
        expect(desktop.setBadge?.mock.calls ?? []).toHaveLength(0);
        expect(jest.getTimerCount()).toBe(0);
        expect(await countRequireCallsIn(requireMock, 60_000)).toBe(0);
      });

      it('stops once every feature is set up while a lookup that no feature needs still retries', async () => {
        const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
        const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
        // 8.10 has no Session badge, so a missing Session module blocks no
        // feature. Its lookup retries for about 31 seconds.
        loadWithModules({
          '/rocketchat.info': { Info: { version: '8.10.0' } },
          'meteor/meteor': meteor,
          'meteor/tracker': tracker,
          '/client/lib/settings/index.ts': {
            settings: createSettingsStore({ Site_Name: 'Open' }),
          },
          '/client/lib/presence.ts': presence,
        });

        await jest.advanceTimersByTimeAsync(2_000);

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        expect(clearIntervalSpy).toHaveBeenCalledWith(
          setIntervalSpy.mock.results[0].value
        );
      });

      it('stops once every feature of a 7.10.15 server is set up', async () => {
        const values: Record<string, unknown> = { Site_Name: 'Legacy' };
        const requireMock = loadWithModules({
          '/app/utils/rocketchat.info': { Info: { version: '7.10.15' } },
          'meteor/meteor': meteor,
          'meteor/session': session,
          'meteor/tracker': tracker,
          '/app/settings/client/index.ts': {
            settings: { get: (key: string) => values[key] },
          },
          '/client/lib/presence.ts': presence,
        });

        await jest.advanceTimersByTimeAsync(2_000);

        expect(desktop.setTitle).toHaveBeenLastCalledWith('Legacy');
        expect(desktop.setUserLoggedIn).toHaveBeenLastCalledWith(true);
        expect(jest.getTimerCount()).toBe(0);
        expect(await countRequireCallsIn(requireMock, 60_000)).toBe(0);
      });

      it('sets up the Session badge, background and idle detector of a 6.3 server, then stops', async () => {
        const values: Record<string, unknown> = {
          Site_Name: 'Old',
          Assets_background: { defaultUrl: 'background.png' },
        };
        const requireMock = loadWithModules({
          '/app/utils/rocketchat.info': { Info: { version: '6.3.0' } },
          'meteor/meteor': meteor,
          'meteor/session': session,
          'meteor/tracker': tracker,
          '/app/settings/client/index.ts': {
            settings: { get: (key: string) => values[key] },
          },
          '/app/utils/client/index.ts': { getUserPreference: () => true },
          'meteor/rocketchat:user-presence': {
            UserPresence: { start: () => undefined },
          },
        });

        // The presence module does not exist on 6.3, so its lookup retries
        // for about 31 seconds before the presence step can run.
        await jest.advanceTimersByTimeAsync(40_000);

        expect(desktop.setBadge).toHaveBeenLastCalledWith(0);
        expect(desktop.setBackground).toHaveBeenLastCalledWith(
          'background.png'
        );
        expect(desktop.setUserPresenceDetection).toHaveBeenCalled();
        expect(desktop.setUserPresence).toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
        expect(await countRequireCallsIn(requireMock, 60_000)).toBe(0);
      });

      it('stops after the module lookups give up when the page answers only the server info', async () => {
        const requireMock = loadWithModules({
          '/rocketchat.info': { Info: { version: '9.0.0' } },
        });

        await jest.advanceTimersByTimeAsync(40_000);

        expect(desktop.setServerInfo).toHaveBeenCalledWith({
          version: '9.0.0',
        });
        expect(desktop.setTitle?.mock.calls ?? []).toHaveLength(0);
        expect(jest.getTimerCount()).toBe(0);
        expect(await countRequireCallsIn(requireMock, 60_000)).toBe(0);
      });
    });

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

    it('leaves the values to a web client that announces bridge contract version 1', async () => {
      const settings = createSettingsStore({ Site_Name: 'Open' });
      loadWithModules({
        '/rocketchat.info': { Info: { version: '9.0.0' } },
        '/client/lib/settings/index.ts': { settings },
        'meteor/tracker': { Tracker: { autorun: (fn: () => void) => fn() } },
      });

      await jest.advanceTimersByTimeAsync(2_000);
      expect(desktop.setTitle).toHaveBeenLastCalledWith('Open');

      desktop.getWebClientBridgeVersion.mockReturnValue(1);
      settings.change('Site_Name', 'Renamed');

      expect(desktop.setTitle).toHaveBeenCalledTimes(1);
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

    it('keeps the status text when a presence update has no text, and clears it when the text is empty', async () => {
      type Entry = { _id: string; status: string; statusText?: unknown };
      const store = new Map<string, Entry>();
      let notifyUser: ((entry: Entry) => void) | undefined;
      // Same merge as the presence store of the web client.
      const notify = (update: Entry) => {
        store.set(update._id, { ...store.get(update._id), ...update });
        notifyUser?.(store.get(update._id) as Entry);
      };
      const Presence = {
        store,
        listen: (_uid: string, handler: (entry: Entry) => void) => {
          notifyUser = handler;
        },
        get: async (uid: string) => store.get(uid),
        stop: jest.fn(),
      };
      notify({ _id: 'user', status: 'online', statusText: 'WFH' });

      loadWithModules({
        '/rocketchat.info': { Info: { version: '8.3.8' } },
        '/client/lib/presence.ts': { Presence },
        'meteor/meteor': {
          Meteor: {
            userId: () => 'user',
            status: () => ({ status: 'connected' }),
            user: () => null,
          },
        },
        'meteor/tracker': { Tracker: { autorun: (fn: () => void) => fn() } },
      });
      await jest.advanceTimersByTimeAsync(2_000);

      const lastSnapshot = () => desktop.setUserPresence.mock.lastCall?.[0];
      expect(lastSnapshot()).toMatchObject({
        presence: 'online',
        presenceStatusText: 'WFH',
      });

      // A status change without a text: the stream sends no third value.
      notify({ _id: 'user', status: 'busy', statusText: undefined });
      expect(lastSnapshot()).toMatchObject({
        presence: 'busy',
        presenceStatusText: 'WFH',
      });
      notify({ _id: 'user', status: 'away', statusText: null });
      expect(lastSnapshot()).toMatchObject({
        presence: 'away',
        presenceStatusText: 'WFH',
      });

      // The user cleared the text.
      notify({ _id: 'user', status: 'away', statusText: '' });
      expect(lastSnapshot()).toMatchObject({
        presence: 'away',
        presenceStatusText: undefined,
      });
      notify({ _id: 'user', status: 'busy', statusText: undefined });
      expect(lastSnapshot()).toMatchObject({
        presence: 'busy',
        presenceStatusText: undefined,
      });
    });
  });
});
