import {
  isCacheOnlyIndexedDb,
  purgeWebClientCacheOnce,
  type PurgeState,
} from '../webClientCachePurge';

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/tmp') },
  webContents: { fromId: jest.fn() },
}));

jest.mock('../../store', () => ({
  listen: jest.fn(),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

const server = 'https://chat.example.com/';

const memoryState = (initial: PurgeState = {}) => {
  let state: PurgeState = { ...initial };
  return {
    readState: jest.fn(async () => ({ ...state })),
    writeState: jest.fn(async (next: PurgeState) => {
      state = { ...next };
    }),
    get: () => state,
  };
};

describe('isCacheOnlyIndexedDb', () => {
  it('accepts the localforage store cache and the Meteor import cache', () => {
    expect(
      isCacheOnlyIndexedDb(
        ['https://chat.example.com/', 'MeteorDynamicImportCache'],
        server
      )
    ).toBe(true);
  });

  it('accepts an origin with no IndexedDB database', () => {
    expect(isCacheOnlyIndexedDb([], server)).toBe(true);
  });

  it('rejects any other database, such as a future key store', () => {
    expect(
      isCacheOnlyIndexedDb(['https://chat.example.com/', 'e2ee-keys'], server)
    ).toBe(false);
  });

  it('rejects a cache name of another origin', () => {
    expect(isCacheOnlyIndexedDb(['https://evil.example.com/'], server)).toBe(
      false
    );
  });
});

describe('purgeWebClientCacheOnce', () => {
  const guest = (names: string[], decrypted = false) => ({
    executeJavaScriptInIsolatedWorld: jest.fn(async () => ({
      names,
      decrypted,
    })),
    reload: jest.fn(),
    session: { clearStorageData: jest.fn(async () => undefined) },
  });

  const run = (
    store: ReturnType<typeof memoryState>,
    wc: ReturnType<typeof guest>
  ) =>
    purgeWebClientCacheOnce(
      server,
      wc as any,
      store.readState,
      store.writeState
    );

  it('clears the IndexedDB of a clean cache-only origin and reloads', async () => {
    const store = memoryState();
    const wc = guest([server, 'MeteorDynamicImportCache']);
    await run(store, wc);
    expect(wc.session.clearStorageData).toHaveBeenCalledWith({
      origin: 'https://chat.example.com',
      storages: ['indexdb'],
    });
    expect(wc.reload).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ [server]: 'purged' });
  });

  it('clears one time only', async () => {
    const store = memoryState();
    const wc = guest([server]);
    await run(store, wc);
    await run(store, wc);
    expect(wc.session.clearStorageData).toHaveBeenCalledTimes(1);
    expect(wc.reload).toHaveBeenCalledTimes(1);
  });

  it('does not clear when another database exists', async () => {
    const store = memoryState();
    const wc = guest([server, 'e2ee-keys']);
    await run(store, wc);
    expect(wc.session.clearStorageData).not.toHaveBeenCalled();
    expect(store.get()).toEqual({ [server]: 'blocked' });
  });

  it('waits while the web client still caches decrypted text', async () => {
    const store = memoryState();
    const wc = guest([server], true);
    await run(store, wc);
    expect(wc.session.clearStorageData).not.toHaveBeenCalled();
    expect(store.get()).toEqual({ [server]: 'waiting' });
  });

  it('clears again after an old web client wrote decrypted text', async () => {
    const store = memoryState({ [server]: 'purged' });
    await run(store, guest([server], true));
    expect(store.get()).toEqual({ [server]: 'waiting' });
    const wc = guest([server]);
    await run(store, wc);
    expect(wc.session.clearStorageData).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ [server]: 'purged' });
  });

  it('ignores a malformed page result', async () => {
    const store = memoryState();
    const wc = {
      ...guest([]),
      executeJavaScriptInIsolatedWorld: jest.fn(async () => 'x'),
    };
    await run(store, wc as any);
    expect(wc.session.clearStorageData).not.toHaveBeenCalled();
    expect(store.writeState).not.toHaveBeenCalled();
  });
});
