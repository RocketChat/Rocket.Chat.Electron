import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchHost, SAVE_DELAY_MS } from '../host';
import type { SearchHost } from '../host';
import {
  createKeyStore,
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
} from '../keyStore';
import {
  collectIndexStats,
  deleteAllIndexes,
  deleteServerIndexes,
  createUserIndexLimiter,
  indexDirOf,
  MAX_USER_INDEXES_PER_SERVER,
  serverDirName,
  userDirName,
} from '../lifecycle';
import { SNAPSHOT_FILE_NAME } from '../snapshotStore';
import type { E2EESearchDoc } from '../types';
import type { WorkerOpenArgs } from '../workerProtocol';
import { createFakeWorkers } from './fakeWorkers';

const docs = (count: number): E2EESearchDoc[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    rid: 'r1',
    uid: 'u1',
    username: 'ana',
    ts: 1000 + i,
    updatedAt: 1000 + i,
    kind: 'text' as const,
    body: `message ${i}`,
  }));

// A server removed from the desktop app leaves no index folder. The folder of a server is e2ee-search/<hash>/, with one
// sub-folder for each user.
describe('E2EE search server removal', () => {
  let root: string;
  let serverA: string;
  let serverB: string;
  let host: SearchHost;

  const openArgs = (dir: string, userId: string): WorkerOpenArgs => ({
    userId,
    dir,
    indexKey: { persistent: true, key: randomBytes(32), reset: false },
  });

  const openWithDocs = async (serverDir: string, userId: string) => {
    const dir = path.join(serverDir, userId);
    await host.open(dir, openArgs(dir, userId));
    await host.call(dir, 'upsert', docs(20));
    return dir;
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-lifecycle-'));
    serverA = path.join(root, 'a'.repeat(64));
    serverB = path.join(root, 'b'.repeat(64));
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
  });

  afterEach(async () => {
    jest.useRealTimers();
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('deletes the folder of the removed server and keeps the other server', async () => {
    const userA = await openWithDocs(serverA, 'user-1');
    const userB = await openWithDocs(serverB, 'user-1');
    await host.flush();
    expect(existsSync(path.join(userA, SNAPSHOT_FILE_NAME))).toBe(true);

    await deleteServerIndexes(host, serverA);

    expect(existsSync(serverA)).toBe(false);
    expect(existsSync(path.join(userB, SNAPSHOT_FILE_NAME))).toBe(true);
    expect(host.indexIds()).toEqual([userB]);
  });

  it('deletes a folder left by an earlier run, with no open index', async () => {
    const old = path.join(serverA, 'user-2');
    mkdirSync(old, { recursive: true });
    writeFileSync(path.join(old, SNAPSHOT_FILE_NAME), 'old');

    await deleteServerIndexes(host, serverA);

    expect(existsSync(serverA)).toBe(false);
  });

  it('does not write unsaved changes back after the delete', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    await openWithDocs(serverA, 'user-1');
    expect(host.hasUnsavedChanges()).toBe(true);

    await deleteServerIndexes(host, serverA);
    // A quit does not wait for an index that no longer exists.
    expect(host.hasUnsavedChanges()).toBe(false);

    await jest.advanceTimersByTimeAsync(SAVE_DELAY_MS * 2);
    await host.flush();
    expect(existsSync(serverA)).toBe(false);
  });

  it('a save in flight when the server is removed does not create the folder again', async () => {
    const dir = await openWithDocs(serverA, 'user-1');

    // The webview ends first: its session close starts the last save.
    const closing = host.close(dir);
    await deleteServerIndexes(host, serverA);
    await closing;

    expect(existsSync(serverA)).toBe(false);
  });

  // Settings, "Clear local search index": every server and user, open or not.
  it('clearing the index root deletes every server and drops all unsaved changes', async () => {
    const userA = await openWithDocs(serverA, 'user-1');
    await openWithDocs(serverB, 'user-2');
    await host.flush();
    await host.call(userA, 'upsert', docs(25));
    expect(host.hasUnsavedChanges()).toBe(true);

    await deleteAllIndexes(host, root);

    expect(existsSync(root)).toBe(false);
    expect(host.indexIds()).toEqual([]);
    expect(host.hasUnsavedChanges()).toBe(false);
    await host.flush();
    expect(existsSync(root)).toBe(false);
  });
});

// Settings shows, for each server, how many messages its index holds, how
// much disk it takes and whether it is encrypted on disk.
describe('E2EE search index stats', () => {
  let root: string;
  let host: SearchHost;
  const encryptedAtRest = new Map<string, boolean>();
  const urlA = 'https://a.example.com';
  const urlB = 'https://b.example.com';

  const open = async (url: string, userId: string, persistent: boolean) => {
    const dir = path.join(root, serverDirName(url), userId);
    const key = randomBytes(32);
    await host.open(dir, {
      userId,
      dir,
      indexKey: persistent
        ? { persistent: true, key, reset: false }
        : { persistent: false, key, reason: 'basic-text-backend' },
    });
    encryptedAtRest.set(dir, persistent);
    return dir;
  };

  const collect = (serverUrls: string[]) =>
    collectIndexStats({
      host,
      rootDir: root,
      serverUrls,
      isEncryptedAtRest: (indexId) => encryptedAtRest.get(indexId),
    });

  const sizeOf = (dir: string) =>
    readdirSync(dir).reduce(
      (sum, name) => sum + statSync(path.join(dir, name)).size,
      0
    );

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-stats-'));
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
    encryptedAtRest.clear();
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('reports docs, disk size and at-rest state for each server', async () => {
    const userA = await open(urlA, 'user-1', true);
    await host.call(userA, 'upsert', docs(20));
    const userB = await open(urlB, 'user-1', false);
    await host.call(userB, 'upsert', docs(7));
    await host.flush();

    expect(await collect([urlA, urlB])).toEqual([
      {
        serverUrl: urlA,
        users: 1,
        docs: 20,
        bytesOnDisk: sizeOf(userA),
        atRest: 'encrypted',
      },
      {
        serverUrl: urlB,
        users: 1,
        docs: 7,
        bytesOnDisk: 0,
        atRest: 'memory-only',
      },
    ]);
    expect(sizeOf(userA)).toBeGreaterThan(0);
  });

  it('adds the users of one server and reports a mixed at-rest state', async () => {
    const user1 = await open(urlA, 'user-1', true);
    await host.call(user1, 'upsert', docs(3));
    const user2 = await open(urlA, 'user-2', false);
    await host.call(user2, 'upsert', docs(4));
    await host.flush();

    const [stats] = await collect([urlA]);
    expect(stats).toMatchObject({
      serverUrl: urlA,
      users: 2,
      docs: 7,
      atRest: 'mixed',
    });
  });

  it('reports a folder of an earlier run with no open index and no known server', async () => {
    const old = path.join(root, 'c'.repeat(64), 'user-9');
    mkdirSync(old, { recursive: true });
    writeFileSync(path.join(old, SNAPSHOT_FILE_NAME), Buffer.alloc(300));

    expect(await collect([urlA])).toEqual([
      {
        serverUrl: undefined,
        users: 1,
        docs: undefined,
        bytesOnDisk: 300,
        atRest: 'encrypted',
      },
    ]);
  });

  it('reports nothing when the index folder does not exist', async () => {
    rmSync(root, { recursive: true, force: true });
    expect(await collect([urlA])).toEqual([]);
  });
});

// The server confirms who the logged-in user is, and a hostile
// server can confirm any user. So at most one user index exists for each
// server: the index of the user that the server confirmed last. A confirmed
// open of a user deletes the indexes of the other users of that server, and
// a logout deletes the indexes of the server. The page also cannot fill the
// disk with folders, because each new user replaces the last one.
describe('E2EE search one user index per server', () => {
  let root: string;
  let serverA: string;
  let serverB: string;
  let host: SearchHost;

  const openArgs = (dir: string, userId: string): WorkerOpenArgs => ({
    userId,
    dir,
    indexKey: { persistent: true, key: randomBytes(32), reset: false },
  });

  // Like openE2EESearchIndex: the key store makes the folder, then the
  // worker opens the index.
  const openOnDisk = (serverDir: string, userId: string) => async () => {
    const dir = path.join(serverDir, userId);
    await new Promise((resolve) => setTimeout(resolve, 5));
    mkdirSync(dir, { recursive: true });
    await host.open(dir, openArgs(dir, userId));
    return dir;
  };

  const openInMemory = (serverDir: string, userId: string) => async () => {
    const dir = path.join(serverDir, userId);
    await host.open(dir, {
      ...openArgs(dir, userId),
      indexKey: {
        persistent: false,
        key: randomBytes(32),
        reason: 'no-encryption',
      },
    });
    return dir;
  };

  const hits = async (indexId: string) =>
    (await host.call(indexId, 'search', { text: 'message' })) as unknown[];

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-one-user-'));
    serverA = path.join(root, 'a'.repeat(64));
    serverB = path.join(root, 'b'.repeat(64));
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('deletes the index of user A when the server confirms user B', async () => {
    const limiter = createUserIndexLimiter({ host });
    const userA = await limiter.admit(
      serverA,
      'user-a',
      openOnDisk(serverA, 'user-a')
    );
    await host.call(userA, 'upsert', docs(20));
    await host.close(userA);
    expect(existsSync(path.join(userA, SNAPSHOT_FILE_NAME))).toBe(true);

    await limiter.admit(serverA, 'user-b', openOnDisk(serverA, 'user-b'));

    expect(readdirSync(serverA)).toEqual(['user-b']);
    // The server confirms user A again: the index of A has no messages.
    const reopened = await limiter.admit(
      serverA,
      'user-a',
      openOnDisk(serverA, 'user-a')
    );
    expect(await hits(reopened)).toHaveLength(0);
    expect(readdirSync(serverA)).toEqual(['user-a']);
  });

  it('discards an open index of user A, so no save writes it again', async () => {
    const limiter = createUserIndexLimiter({ host });
    const userA = await limiter.admit(
      serverA,
      'user-a',
      openOnDisk(serverA, 'user-a')
    );
    await host.call(userA, 'upsert', docs(5));

    await limiter.admit(serverA, 'user-b', openOnDisk(serverA, 'user-b'));
    await host.flush();

    expect(host.indexIds()).toEqual([path.join(serverA, 'user-b')]);
    expect(existsSync(userA)).toBe(false);
  });

  it('replaces a memory-only index of another user', async () => {
    const limiter = createUserIndexLimiter({ host });
    await limiter.admit(serverA, 'user-a', openInMemory(serverA, 'user-a'));
    await limiter.admit(serverA, 'user-b', openInMemory(serverA, 'user-b'));
    expect(host.indexIds()).toEqual([path.join(serverA, 'user-b')]);
  });

  it('keeps the index of the same user and the indexes of other servers', async () => {
    const limiter = createUserIndexLimiter({ host });
    const userB = await limiter.admit(
      serverB,
      'user-a',
      openOnDisk(serverB, 'user-a')
    );
    await host.call(userB, 'upsert', docs(3));
    const userA = await limiter.admit(
      serverA,
      'user-a',
      openOnDisk(serverA, 'user-a')
    );
    await host.call(userA, 'upsert', docs(4));

    await expect(
      limiter.admit(serverA, 'user-a', openOnDisk(serverA, 'user-a'))
    ).resolves.toBe(userA);
    expect(await hits(userA)).toHaveLength(4);

    await limiter.admit(serverA, 'user-b', openOnDisk(serverA, 'user-b'));
    expect(await hits(userB)).toHaveLength(3);
  });

  it('keeps one user folder when a page opens many users at the same time', async () => {
    const limiter = createUserIndexLimiter({ host });
    await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        limiter.admit(serverA, `user-${i}`, openOnDisk(serverA, `user-${i}`))
      )
    );
    expect(readdirSync(serverA)).toEqual(['user-5']);
    expect(host.indexIds()).toEqual([path.join(serverA, 'user-5')]);
  });

  it('deletes the indexes of a server on a logout, after a running open', async () => {
    const limiter = createUserIndexLimiter({ host });
    const userB = await limiter.admit(
      serverB,
      'user-a',
      openOnDisk(serverB, 'user-a')
    );
    const opening = limiter.admit(
      serverA,
      'user-a',
      openOnDisk(serverA, 'user-a')
    );
    const loggedOut = limiter.deleteUserIndexes(serverA);
    await opening;
    await loggedOut;

    expect(existsSync(serverA)).toBe(false);
    expect(host.indexIds()).toEqual([userB]);
  });

  // An index sealed by a wrap key from the user's
  // E2EE private key survives a logout and a confirmed open of another user.
  // No page without that private key can open it.
  describe('with indexes sealed by a wrap key', () => {
    let sealed: Set<string>;
    const limiterFor = () =>
      createUserIndexLimiter({
        host,
        isSealed: async (indexDir) => sealed.has(indexDir),
      });

    beforeEach(() => {
      sealed = new Set();
    });

    it('keeps a sealed index on a logout and saves its open changes', async () => {
      const limiter = limiterFor();
      const userA = await limiter.admit(
        serverA,
        'user-a',
        openOnDisk(serverA, 'user-a')
      );
      sealed.add(userA);
      await host.call(userA, 'upsert', docs(7));

      await limiter.deleteUserIndexes(serverA);

      expect(host.indexIds()).toEqual([]);
      expect(existsSync(path.join(userA, SNAPSHOT_FILE_NAME))).toBe(true);
    });

    it('deletes the plain indexes of the server on a logout', async () => {
      const limiter = limiterFor();
      await limiter.admit(serverA, 'user-a', openOnDisk(serverA, 'user-a'));
      await limiter.deleteUserIndexes(serverA);
      expect(existsSync(path.join(serverA, 'user-a'))).toBe(false);
    });

    it('keeps sealed user A and deletes plain user C when the server confirms user B', async () => {
      const limiter = limiterFor();
      const userA = await limiter.admit(
        serverA,
        'user-a',
        openOnDisk(serverA, 'user-a')
      );
      sealed.add(userA);
      await host.call(userA, 'upsert', docs(4));
      await host.close(userA);
      await limiter.admit(serverA, 'user-c', openOnDisk(serverA, 'user-c'));

      await limiter.admit(serverA, 'user-b', openOnDisk(serverA, 'user-b'));

      expect(readdirSync(serverA).sort()).toEqual(['user-a', 'user-b']);
      expect(existsSync(path.join(userA, SNAPSHOT_FILE_NAME))).toBe(true);
    });

    // A hostile server can confirm made-up users and seal their indexes with
    // wrap keys of its own. A full server refuses a new user index, so these
    // opens cannot push out the sealed index of the real user.
    it(`refuses a new user index when ${MAX_USER_INDEXES_PER_SERVER} sealed indexes fill the server, and deletes none of them`, async () => {
      const limiter = limiterFor();
      const realUser = await limiter.admit(
        serverA,
        'real-user',
        openOnDisk(serverA, 'real-user')
      );
      sealed.add(realUser);
      await host.call(realUser, 'upsert', docs(5));
      await host.close(realUser);
      const madeUp = Array.from(
        { length: MAX_USER_INDEXES_PER_SERVER },
        (_, i) => `made-up-${i}`
      );
      const results: PromiseSettledResult<string>[] = [];
      for (const userId of madeUp) {
        // eslint-disable-next-line no-await-in-loop -- one open after the other, like a page
        const [result] = await Promise.allSettled([
          limiter.admit(serverA, userId, openOnDisk(serverA, userId)),
        ]);
        if (result.status === 'fulfilled') sealed.add(result.value);
        results.push(result);
      }

      expect(results.map(({ status }) => status)).toEqual([
        ...Array(MAX_USER_INDEXES_PER_SERVER - 1).fill('fulfilled'),
        'rejected',
      ]);
      expect(
        (results[MAX_USER_INDEXES_PER_SERVER - 1] as PromiseRejectedResult)
          .reason
      ).toMatchObject({ name: 'E2EESearchUserIndexLimitError' });
      expect(readdirSync(serverA).sort()).toEqual(
        ['real-user', ...madeUp.slice(0, -1)].sort()
      );
      expect(existsSync(path.join(realUser, SNAPSHOT_FILE_NAME))).toBe(true);

      // The real user can still open the kept index.
      await expect(
        limiter.admit(serverA, 'real-user', openOnDisk(serverA, 'real-user'))
      ).resolves.toBe(realUser);
    });

    it('does not open the refused index, so it writes no folder', async () => {
      const limiter = limiterFor();
      for (let i = 0; i < MAX_USER_INDEXES_PER_SERVER; i++) {
        // eslint-disable-next-line no-await-in-loop -- one open after the other, like a page
        const dir = await limiter.admit(
          serverA,
          `user-${i}`,
          openOnDisk(serverA, `user-${i}`)
        );
        sealed.add(dir);
      }
      const open = jest.fn(openOnDisk(serverA, 'user-new'));

      await expect(limiter.admit(serverA, 'user-new', open)).rejects.toThrow();

      expect(open).not.toHaveBeenCalled();
      expect(existsSync(path.join(serverA, 'user-new'))).toBe(false);
    });

    it('still deletes plain indexes when it refuses a new user index', async () => {
      const limiter = limiterFor();
      for (let i = 0; i < MAX_USER_INDEXES_PER_SERVER; i++) {
        // eslint-disable-next-line no-await-in-loop -- one open after the other, like a page
        const dir = await limiter.admit(
          serverA,
          `user-${i}`,
          openOnDisk(serverA, `user-${i}`)
        );
        if (i > 0) sealed.add(dir);
      }
      // user-0 is plain, so it does not hold a place: user-new opens.
      await limiter.admit(serverA, 'user-new', openOnDisk(serverA, 'user-new'));

      expect(readdirSync(serverA).sort()).toEqual(
        ['user-1', 'user-2', 'user-3', 'user-new'].sort()
      );
    });
  });

  // The user removes the server while the page
  // opens its index. The open must not write the folder again.
  describe('a server removed while an open waits', () => {
    let known: Set<string>;
    const limiterFor = () =>
      createUserIndexLimiter({
        host,
        isServerKnown: (serverDir) => known.has(serverDir),
      });

    beforeEach(() => {
      known = new Set([serverA, serverB]);
    });

    it('refuses an open that runs after the removal, and leaves no folder', async () => {
      const limiter = limiterFor();
      const open = jest.fn(openOnDisk(serverA, 'user-a'));
      known.delete(serverA);
      const removed = limiter.removeServer(serverA);
      const opening = limiter.admit(serverA, 'user-a', open);

      await removed;
      await expect(opening).rejects.toThrow();
      expect(open).not.toHaveBeenCalled();
      expect(existsSync(serverA)).toBe(false);
      expect(host.indexIds()).toEqual([]);
    });

    it('refuses an open in progress when the removal comes, and leaves no folder', async () => {
      const limiter = limiterFor();
      const userB = await limiter.admit(
        serverB,
        'user-a',
        openOnDisk(serverB, 'user-a')
      );
      let release = () => undefined as void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const opening = limiter.admit(serverA, 'user-a', async () => {
        await gate;
        return openOnDisk(serverA, 'user-a')();
      });
      // The open task runs (the key store waits for the keychain).
      await new Promise((resolve) => setTimeout(resolve, 5));
      known.delete(serverA);
      const removed = limiter.removeServer(serverA);
      release();

      await expect(opening).rejects.toThrow();
      await removed;
      await host.flush();
      expect(existsSync(serverA)).toBe(false);
      expect(host.indexIds()).toEqual([userB]);
    });
  });
});

// Meteor ids are case-sensitive, but the disks of
// macOS and Windows are not. The folder of user `ABC` must not be the folder
// of user `abc`, and a Windows device name must not be a folder name.
describe('E2EE search user folders', () => {
  let root: string;
  let host: SearchHost;
  const url = 'https://a.example.com';
  const windowsDeviceName = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-users-'));
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('gives user ids that differ only in case different folders', () => {
    expect(indexDirOf(root, url, 'abc').toLowerCase()).not.toBe(
      indexDirOf(root, url, 'ABC').toLowerCase()
    );
    expect(userDirName('abc').toLowerCase()).not.toBe(
      userDirName('ABC').toLowerCase()
    );
  });

  it('does not use a Windows device name as a folder name', () => {
    for (const userId of ['CON', 'nul', 'Aux', 'COM1', 'lpt9', 'PRN']) {
      expect(userDirName(userId)).not.toMatch(windowsDeviceName);
    }
  });

  it('keeps the snapshot of `abc` when `ABC` opens on the same server', async () => {
    const open = async (userId: string) => {
      const dir = indexDirOf(root, url, userId);
      await host.open(dir, {
        userId,
        dir,
        indexKey: { persistent: true, key: randomBytes(32), reset: false },
      });
      return dir;
    };
    const lower = await open('abc');
    await host.call(lower, 'upsert', docs(5));
    await host.flush();
    const snapshot = path.join(lower, SNAPSHOT_FILE_NAME);
    const before = readFileSync(snapshot);

    const upper = await open('ABC');
    await host.call(upper, 'upsert', docs(9));
    await host.flush();

    expect(readFileSync(snapshot).equals(before)).toBe(true);
  });
});

// End to end with the real key store: the index of a user
// survives a logout. It opens again only with the wrap key that sealed it.
describe('E2EE search sealed index across a logout', () => {
  let root: string;
  let serverDir: string;
  let host: SearchHost;
  const wrapKey = Buffer.alloc(32, 3);

  // A reversible stand-in for the OS keychain.
  const safeStorage = {
    isAsyncEncryptionAvailable: async () => true,
    getSelectedStorageBackend: () => 'gnome_libsecret' as const,
    encryptStringAsync: async (plain: string) =>
      Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`),
    decryptStringAsync: async (encrypted: Buffer) => ({
      result: Buffer.from(
        encrypted.toString().slice('wrapped:'.length),
        'hex'
      ).toString(),
      shouldReEncrypt: false,
    }),
  };
  const keyStoreOf = (dir: string) =>
    createKeyStore({ dir, safeStorage, platform: 'darwin' });

  // Like openE2EESearchIndex in setup.ts.
  const openWith =
    (userId: string, wrap?: Buffer) => async (): Promise<string> => {
      const dir = path.join(serverDir, userId);
      const indexKey = await keyStoreOf(dir).load(
        wrap ? { wrapKey: Buffer.from(wrap) } : undefined
      );
      await host.open(dir, { userId, dir, indexKey });
      return dir;
    };

  const hits = async (indexId: string) =>
    (await host.call(indexId, 'search', { text: 'message' })) as unknown[];

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-sealed-'));
    serverDir = path.join(root, 'a'.repeat(64));
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('opens with the right wrap key after a logout, and not with a wrong one', async () => {
    const limiter = createUserIndexLimiter({
      host,
      isSealed: (indexDir) => keyStoreOf(indexDir).isSealed(),
    });
    const userA = await limiter.admit(
      serverDir,
      'user-a',
      openWith('user-a', wrapKey)
    );
    await host.call(userA, 'upsert', docs(20));

    await limiter.deleteUserIndexes(serverDir);
    // A hostile server confirms user B, then user A without the private key.
    await limiter.admit(serverDir, 'user-b', openWith('user-b'));
    await expect(
      limiter.admit(
        serverDir,
        'user-a',
        openWith('user-a', Buffer.alloc(32, 9))
      )
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    await expect(
      limiter.admit(serverDir, 'user-a', openWith('user-a'))
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });

    const reopened = await limiter.admit(
      serverDir,
      'user-a',
      openWith('user-a', wrapKey)
    );
    expect(await hits(reopened)).toHaveLength(20);
  });

  // An E2E key reset wipes the open index, and the
  // next login derives another wrap key. The wipe must not leave a key.bin
  // sealed by the old wrap key, or the new one cannot open the index.
  it('deletes the user index on a wipe, so the wrap key after an E2E key reset opens a new empty index', async () => {
    const limiter = createUserIndexLimiter({
      host,
      isSealed: (indexDir) => keyStoreOf(indexDir).isSealed(),
    });
    const userA = await limiter.admit(
      serverDir,
      'user-a',
      openWith('user-a', wrapKey)
    );
    await host.call(userA, 'upsert', docs(20));
    await host.flush();

    await limiter.deleteUserIndex(serverDir, userA);
    expect(host.indexIds()).not.toContain(userA);
    expect(existsSync(userA)).toBe(false);

    await limiter.deleteUserIndexes(serverDir);
    const reopened = await limiter.admit(
      serverDir,
      'user-a',
      openWith('user-a', Buffer.alloc(32, 9))
    );
    expect(await hits(reopened)).toHaveLength(0);
  });
});
