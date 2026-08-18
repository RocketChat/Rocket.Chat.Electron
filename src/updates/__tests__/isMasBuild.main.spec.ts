import type * as AppStoreUpdatesModule from '../appStoreUpdates';

/**
 * `isMasBuild` (src/updates/appStoreUpdates.ts) captures `app.isPackaged` at
 * module load — before setupUpdates's dev-mode patch
 * (`Object.defineProperty(app, 'isPackaged', { get: () => true })`) can run —
 * so each scenario here needs its own fresh module instance with
 * `app.isPackaged`/env set up beforehand. This lives in its own file (no
 * top-level `jest.mock('electron', ...)`, unlike appStoreUpdates.main.spec.ts)
 * because a hoisted `jest.mock` for a module id wins over a later
 * `jest.doMock` for the same id inside `jest.isolateModules`, which would
 * otherwise make every isolated `require` see the same (wrong) `app` mock.
 */
describe('isMasBuild', () => {
  const originalMas = process.mas;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSimulateMas = process.env.ROCKETCHAT_SIMULATE_MAS;

  afterEach(() => {
    (process as { mas?: boolean }).mas = originalMas;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ROCKETCHAT_SIMULATE_MAS = originalSimulateMas;
  });

  const loadIsMasBuild = (options: {
    mas?: boolean;
    isPackaged: boolean;
    nodeEnv?: string;
    simulateMas?: string;
  }): boolean => {
    (process as { mas?: boolean }).mas = options.mas ?? false;
    process.env.NODE_ENV = options.nodeEnv;
    process.env.ROCKETCHAT_SIMULATE_MAS = options.simulateMas;

    let result!: boolean;
    jest.isolateModules(() => {
      jest.doMock('electron', () => ({
        app: { isPackaged: options.isPackaged },
        shell: { openExternal: jest.fn() },
      }));
      const appStoreUpdatesModule = // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../appStoreUpdates') as typeof AppStoreUpdatesModule;
      const { isMasBuild } = appStoreUpdatesModule;
      result = isMasBuild();
    });
    return result;
  };

  it('returns true when process.mas is true, regardless of packaging/env', () => {
    expect(
      loadIsMasBuild({
        mas: true,
        isPackaged: true,
        nodeEnv: 'production',
        simulateMas: undefined,
      })
    ).toBe(true);
  });

  it('returns false when process.mas is not true and no simulation override', () => {
    expect(
      loadIsMasBuild({
        isPackaged: false,
        nodeEnv: 'development',
        simulateMas: undefined,
      })
    ).toBe(false);
  });

  it('returns true in unpackaged dev runs when ROCKETCHAT_SIMULATE_MAS=true', () => {
    expect(
      loadIsMasBuild({
        isPackaged: false,
        nodeEnv: 'development',
        simulateMas: 'true',
      })
    ).toBe(true);
  });

  it('stays true when isPackaged is force-patched to true after load (the setupUpdates dev patch), since the value is captured at load', () => {
    (process as { mas?: boolean }).mas = false;
    process.env.NODE_ENV = 'development';
    process.env.ROCKETCHAT_SIMULATE_MAS = 'true';

    let result!: boolean;
    jest.isolateModules(() => {
      // Starts unpackaged, exactly like setupUpdates sees it before its own
      // Object.defineProperty patch runs later in the same dev process.
      const mockApp: { isPackaged: boolean } = { isPackaged: false };
      jest.doMock('electron', () => ({
        app: mockApp,
        shell: { openExternal: jest.fn() },
      }));
      const appStoreUpdatesModule = // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../appStoreUpdates') as typeof AppStoreUpdatesModule;
      const { isMasBuild } = appStoreUpdatesModule;

      // Simulates setupUpdates's
      // Object.defineProperty(app, 'isPackaged', { get: () => true })
      // running after appStoreUpdates.ts already captured the real value.
      mockApp.isPackaged = true;

      result = isMasBuild();
    });

    expect(result).toBe(true);
  });

  it('ignores the simulation override in packaged (non-MAS) builds', () => {
    expect(
      loadIsMasBuild({
        isPackaged: true,
        nodeEnv: 'production',
        simulateMas: 'true',
      })
    ).toBe(false);
  });

  it('ignores the simulation override when NODE_ENV is production even if unpackaged', () => {
    expect(
      loadIsMasBuild({
        isPackaged: false,
        nodeEnv: 'production',
        simulateMas: 'true',
      })
    ).toBe(false);
  });
});
