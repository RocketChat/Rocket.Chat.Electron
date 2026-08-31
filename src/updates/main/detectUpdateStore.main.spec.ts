import type * as StoreUpdatesModule from '../storeUpdates';

/**
 * `detectUpdateStore` (src/updates/storeUpdates.ts) captures `app.isPackaged`
 * at module load — before setupUpdates's dev-mode patch
 * (`Object.defineProperty(app, 'isPackaged', { get: () => true })`) can run —
 * so each scenario here needs its own fresh module instance with
 * `app.isPackaged`/env/process markers set up beforehand. This lives in its
 * own file (no top-level `jest.mock('electron', ...)`, unlike
 * storeUpdates.main.spec.ts) because a hoisted `jest.mock` for a module id
 * wins over a later `jest.doMock` for the same id inside
 * `jest.isolateModules`, which would otherwise make every isolated `require`
 * see the same (wrong) `app` mock.
 */
describe('detectUpdateStore', () => {
  const originalMas = process.mas;
  const originalWindowsStore = process.windowsStore;
  const originalSnap = process.env.SNAP;
  const originalFlatpakId = process.env.FLATPAK_ID;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSimulateStore = process.env.ROCKETCHAT_SIMULATE_STORE;

  // process.env values are always strings — assigning `undefined` coerces to
  // the literal string "undefined" (truthy!) instead of clearing the key, so
  // every optional env var here must be `delete`d, not assigned `undefined`.
  const setOrDeleteEnv = (key: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  afterEach(() => {
    (process as { mas?: boolean }).mas = originalMas;
    (process as { windowsStore?: boolean }).windowsStore = originalWindowsStore;
    setOrDeleteEnv('SNAP', originalSnap);
    setOrDeleteEnv('FLATPAK_ID', originalFlatpakId);
    setOrDeleteEnv('NODE_ENV', originalNodeEnv);
    setOrDeleteEnv('ROCKETCHAT_SIMULATE_STORE', originalSimulateStore);
  });

  const loadDetectUpdateStore = (options: {
    mas?: boolean;
    windowsStore?: boolean;
    snap?: string;
    flatpakId?: string;
    isPackaged: boolean;
    nodeEnv?: string;
    simulateStore?: string;
  }): ReturnType<typeof StoreUpdatesModule.detectUpdateStore> => {
    (process as { mas?: boolean }).mas = options.mas ?? false;
    (process as { windowsStore?: boolean }).windowsStore =
      options.windowsStore ?? false;
    setOrDeleteEnv('SNAP', options.snap);
    setOrDeleteEnv('FLATPAK_ID', options.flatpakId);
    setOrDeleteEnv('NODE_ENV', options.nodeEnv);
    setOrDeleteEnv('ROCKETCHAT_SIMULATE_STORE', options.simulateStore);

    let result!: ReturnType<typeof StoreUpdatesModule.detectUpdateStore>;
    jest.isolateModules(() => {
      jest.doMock('electron', () => ({
        app: { isPackaged: options.isPackaged },
        shell: { openExternal: jest.fn() },
      }));
      const storeUpdatesModule = // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../storeUpdates') as typeof StoreUpdatesModule;
      result = storeUpdatesModule.detectUpdateStore();
    });
    return result;
  };

  it('returns null with no markers and no simulation', () => {
    expect(
      loadDetectUpdateStore({ isPackaged: false, nodeEnv: 'development' })
    ).toBeNull();
  });

  it('returns mas when process.mas is true, regardless of other markers', () => {
    expect(
      loadDetectUpdateStore({
        mas: true,
        windowsStore: true,
        snap: '/snap/rocketchat-desktop/x1',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('mas');
  });

  it('returns windows when process.windowsStore is true (and mas is not)', () => {
    expect(
      loadDetectUpdateStore({
        windowsStore: true,
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('windows');
  });

  it('returns snap when SNAP is set (and mas/windowsStore are not)', () => {
    expect(
      loadDetectUpdateStore({
        snap: '/snap/rocketchat-desktop/x1',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('snap');
  });

  it('returns flatpak when FLATPAK_ID is set (and nothing else matches)', () => {
    expect(
      loadDetectUpdateStore({
        flatpakId: 'chat.rocket.RocketChat',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('flatpak');
  });

  it('detection precedence: mas wins over windows/snap/flatpak all present', () => {
    expect(
      loadDetectUpdateStore({
        mas: true,
        windowsStore: true,
        snap: '/snap/rocketchat-desktop/x1',
        flatpakId: 'chat.rocket.RocketChat',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('mas');
  });

  it('detection precedence: windows wins over snap/flatpak when mas is absent', () => {
    expect(
      loadDetectUpdateStore({
        windowsStore: true,
        snap: '/snap/rocketchat-desktop/x1',
        flatpakId: 'chat.rocket.RocketChat',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('windows');
  });

  it('detection precedence: snap wins over flatpak when mas/windows are absent', () => {
    expect(
      loadDetectUpdateStore({
        snap: '/snap/rocketchat-desktop/x1',
        flatpakId: 'chat.rocket.RocketChat',
        isPackaged: true,
        nodeEnv: 'production',
      })
    ).toBe('snap');
  });

  it.each(['mas', 'windows', 'snap', 'flatpak'] as const)(
    'returns %s in unpackaged dev runs when ROCKETCHAT_SIMULATE_STORE=%s',
    (store) => {
      expect(
        loadDetectUpdateStore({
          isPackaged: false,
          nodeEnv: 'development',
          simulateStore: store,
        })
      ).toBe(store);
    }
  );

  it('real store markers take precedence over the simulation override', () => {
    expect(
      loadDetectUpdateStore({
        mas: true,
        isPackaged: false,
        nodeEnv: 'development',
        simulateStore: 'flatpak',
      })
    ).toBe('mas');
  });

  it('ignores an unrecognized ROCKETCHAT_SIMULATE_STORE value', () => {
    expect(
      loadDetectUpdateStore({
        isPackaged: false,
        nodeEnv: 'development',
        simulateStore: 'nonsense',
      })
    ).toBeNull();
  });

  it('stays store-detected when isPackaged is force-patched to true after load (the setupUpdates dev patch), since the value is captured at load', () => {
    process.env.NODE_ENV = 'development';
    process.env.ROCKETCHAT_SIMULATE_STORE = 'snap';
    (process as { mas?: boolean }).mas = false;
    (process as { windowsStore?: boolean }).windowsStore = false;
    delete process.env.SNAP;
    delete process.env.FLATPAK_ID;

    let result!: ReturnType<typeof StoreUpdatesModule.detectUpdateStore>;
    jest.isolateModules(() => {
      // Starts unpackaged, exactly like setupUpdates sees it before its own
      // Object.defineProperty patch runs later in the same dev process.
      const mockApp: { isPackaged: boolean } = { isPackaged: false };
      jest.doMock('electron', () => ({
        app: mockApp,
        shell: { openExternal: jest.fn() },
      }));
      const storeUpdatesModule = // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../storeUpdates') as typeof StoreUpdatesModule;

      // Simulates setupUpdates's
      // Object.defineProperty(app, 'isPackaged', { get: () => true })
      // running after storeUpdates.ts already captured the real value.
      mockApp.isPackaged = true;

      result = storeUpdatesModule.detectUpdateStore();
    });

    expect(result).toBe('snap');
  });

  it('ignores the simulation override in packaged (non-store) builds', () => {
    expect(
      loadDetectUpdateStore({
        isPackaged: true,
        nodeEnv: 'production',
        simulateStore: 'mas',
      })
    ).toBeNull();
  });

  it('ignores the simulation override when NODE_ENV is production even if unpackaged', () => {
    expect(
      loadDetectUpdateStore({
        isPackaged: false,
        nodeEnv: 'production',
        simulateStore: 'mas',
      })
    ).toBeNull();
  });
});
