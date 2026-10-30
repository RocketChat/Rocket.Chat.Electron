import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

import { workerEnvOf } from '../workerEnv';
import {
  createWorkerHandler,
  fileStoreSelected,
  zeroRequestKey,
} from '../workerHandler';
import type { WorkerOpenArgs, WorkerRequest } from '../workerProtocol';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

// SQLITE_TEMP_STORE_MEMORY. With 0 (the default) or 1, SQLite can write
// sort runs and temp tables to plaintext files in the OS temp folder.
const TEMP_STORE_MEMORY = 2;

const openedDbs: DatabaseSyncType[] = [];

class RecordingDatabaseSync extends DatabaseSync {
  constructor(...args: ConstructorParameters<typeof DatabaseSync>) {
    super(...args);
    openedDbs.push(this);
  }
}

const tempStoreOf = (db: DatabaseSyncType) =>
  (db.prepare('PRAGMA temp_store').get() as { temp_store: number }).temp_store;

describe('E2EE search worker handler', () => {
  let dir: string;
  let nextId = 0;
  const handler = () =>
    createWorkerHandler({
      DatabaseSync: RecordingDatabaseSync as unknown as typeof DatabaseSync,
    });
  const request = (
    h: ReturnType<typeof handler>,
    method: WorkerRequest['method'],
    args: unknown[] = []
  ) => {
    nextId += 1;
    return h.handle({ id: nextId, indexId: 'i1', method, args });
  };

  beforeEach(() => {
    openedDbs.length = 0;
    dir = mkdtempSync(path.join(tmpdir(), 'e2ee-worker-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps SQLite temp data in memory, also after a snapshot load', async () => {
    const args: WorkerOpenArgs = {
      userId: 'u1',
      dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };

    const first = handler();
    expect(await request(first, 'open', [args])).toMatchObject({ ok: true });
    expect(tempStoreOf(openedDbs[0])).toBe(TEMP_STORE_MEMORY);
    expect(await request(first, 'save')).toMatchObject({ ok: true });
    await request(first, 'close');

    const second = handler();
    expect(await request(second, 'open', [args])).toMatchObject({ ok: true });
    expect(tempStoreOf(openedDbs[1])).toBe(TEMP_STORE_MEMORY);
    await request(second, 'close');
  });

  // The snapshot is the serialized database, free pages included. Without
  // secure_delete, a wiped, removed or edited message stays in index.bin.
  it('leaves no wiped or removed text in the snapshot, also after a snapshot load', async () => {
    const args: WorkerOpenArgs = {
      userId: 'u1',
      dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };
    const docs = (prefix: string) =>
      Array.from({ length: 200 }, (_, i) => ({
        id: `${prefix}${i}`,
        rid: 'r1',
        uid: 'u1',
        username: 'ana',
        ts: 1000 + i,
        updatedAt: 1000 + i,
        kind: 'text',
        body: `${prefix}canaryzebra ${i} ${'padding words '.repeat(8)}`,
      }));
    const snapshotHas = (db: DatabaseSyncType, token: string) =>
      Buffer.from(
        (db as unknown as { serialize(): Uint8Array }).serialize()
      ).includes(token);

    const first = handler();
    expect(await request(first, 'open', [args])).toMatchObject({ ok: true });
    await request(first, 'upsert', [docs('rm')]);
    await request(first, 'remove', [docs('rm').map(({ id }) => id)]);
    expect(snapshotHas(openedDbs[0], 'rmcanaryzebra')).toBe(false);

    await request(first, 'upsert', [docs('wp')]);
    expect(await request(first, 'save')).toMatchObject({ ok: true });
    await request(first, 'close');

    const second = handler();
    expect(await request(second, 'open', [args])).toMatchObject({ ok: true });
    expect(snapshotHas(openedDbs[1], 'wpcanaryzebra')).toBe(true);
    expect(await request(second, 'wipe')).toMatchObject({ ok: true });
    expect(snapshotHas(openedDbs[1], 'wpcanaryzebra')).toBe(false);
    await request(second, 'close');
  });

  // The worker zeroes its copy of the index key when the index
  // closes or the open fails, and the worker entry zeroes the key of each
  // open request after the handler copied it.
  describe('zeroes the index key', () => {
    const isZero = (bytes: Uint8Array) => bytes.every((byte) => byte === 0);

    // The copies that the handler makes of `key`.
    const copiesOf = (key: Uint8Array) => {
      const copies: Buffer[] = [];
      const from = Buffer.from.bind(Buffer);
      const spy = jest.spyOn(Buffer, 'from').mockImplementation(((
        ...args: Parameters<typeof Buffer.from>
      ) => {
        const result = (from as (...a: unknown[]) => Buffer)(...args);
        if (args[0] === key) copies.push(result);
        return result;
      }) as typeof Buffer.from);
      return { copies, restore: () => spy.mockRestore() };
    };

    const openArgs = (key: Buffer): WorkerOpenArgs => ({
      userId: 'u1',
      dir,
      indexKey: { persistent: true, key, reset: false },
    });

    it('zeroes the copy when the index closes', async () => {
      const key = randomBytes(32);
      const h = handler();
      const { copies, restore } = copiesOf(key);
      try {
        expect(await request(h, 'open', [openArgs(key)])).toMatchObject({
          ok: true,
        });
      } finally {
        restore();
      }
      expect(copies).toHaveLength(1);
      expect(isZero(copies[0])).toBe(false);

      await request(h, 'close');
      expect(isZero(copies[0])).toBe(true);
    });

    it('zeroes the copy when the open fails', async () => {
      class FailingDatabaseSync extends DatabaseSync {
        override exec(sql: string): void {
          if (sql.includes('temp_store')) throw new Error('disk I/O error');
          super.exec(sql);
        }
      }
      const key = randomBytes(32);
      const h = createWorkerHandler({
        DatabaseSync: FailingDatabaseSync as unknown as typeof DatabaseSync,
      });
      const { copies, restore } = copiesOf(key);
      try {
        expect(await request(h, 'open', [openArgs(key)])).toMatchObject({
          ok: false,
        });
      } finally {
        restore();
      }
      expect(copies).toHaveLength(1);
      expect(isZero(copies[0])).toBe(true);
    });

    it('zeroes the key of an open request, and the open index keeps its own copy', async () => {
      const key = randomBytes(32);
      const keyCopy = Buffer.from(key);
      const open: WorkerRequest = {
        id: 1,
        indexId: 'i1',
        method: 'open',
        args: [openArgs(key)],
      };
      const doc = {
        id: 'm1',
        rid: 'r1',
        uid: 'u1',
        username: 'ana',
        ts: 1000,
        updatedAt: 1000,
        kind: 'text',
        body: 'keptzebra words',
      };

      const first = handler();
      expect(await first.handle(open)).toMatchObject({ ok: true });
      zeroRequestKey(open);
      expect(isZero(key)).toBe(true);
      await request(first, 'upsert', [[doc]]);
      expect(await request(first, 'save')).toMatchObject({ ok: true });
      await request(first, 'close');

      const second = handler();
      expect(await request(second, 'open', [openArgs(keyCopy)])).toMatchObject({
        ok: true,
      });
      expect(
        await request(second, 'search', [{ text: 'keptzebra' }])
      ).toMatchObject({ ok: true, value: [{ id: 'm1' }] });
      await request(second, 'close');
    });

    it('leaves a request of another method as it is', () => {
      const docs = [{ id: 'm1' }];
      const upsert: WorkerRequest = {
        id: 1,
        indexId: 'i1',
        method: 'upsert',
        args: [docs],
      };
      zeroRequestKey(upsert);
      expect(upsert.args).toEqual([[{ id: 'm1' }]]);
    });
  });

  // The file store is the default. A build where the native SQLite
  // module does not load (a missing or wrong-ABI binary) must still search,
  // with the snapshot store.
  // An open that timed out on the keychain keeps its memory-only
  // index, also when a later open of the same index gets a keychain key.
  it('reports the at-rest state of the index that is already open', async () => {
    const h = handler();
    const memoryOnly: WorkerOpenArgs = {
      userId: 'u1',
      dir,
      indexKey: {
        persistent: false,
        key: randomBytes(32),
        reason: 'keychain-timeout',
      },
    };
    const persistent: WorkerOpenArgs = {
      userId: 'u1',
      dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };

    expect(await request(h, 'open', [memoryOnly])).toMatchObject({
      ok: true,
      value: { encryptedAtRest: false },
    });
    expect(await request(h, 'open', [persistent])).toMatchObject({
      ok: true,
      value: { encryptedAtRest: false },
    });
    await request(h, 'close');
  });

  describe('file store fallback', () => {
    const doc = (id: string, body: string) => ({
      id,
      rid: 'r1',
      uid: 'u1',
      username: 'ana',
      ts: 1000,
      updatedAt: 1000,
      kind: 'text',
      body,
    });
    const nativeLoadFails = () => {
      const error = new Error('dlopen failed: better_sqlite3.node');
      Object.assign(error, { code: 'ERR_DLOPEN_FAILED' });
      throw error;
    };

    it('uses the file store by default, and the snapshot store only on opt-out', () => {
      expect(fileStoreSelected(undefined)).toBe(true);
      expect(fileStoreSelected('')).toBe(true);
      expect(fileStoreSelected('file')).toBe(true);
      expect(fileStoreSelected('snapshot')).toBe(false);
    });

    it('ignores the store switch in a packaged build and honors it in a dev build', () => {
      const env = {
        PATH: '/usr/bin',
        ROCKETCHAT_E2EE_SEARCH_STORE: 'snapshot',
      };

      const packaged = workerEnvOf(env, true);
      expect(packaged.ROCKETCHAT_E2EE_SEARCH_STORE).toBeUndefined();
      expect(packaged.PATH).toBe('/usr/bin');
      expect(fileStoreSelected(packaged.ROCKETCHAT_E2EE_SEARCH_STORE)).toBe(
        true
      );

      const dev = workerEnvOf(env, false);
      expect(dev.ROCKETCHAT_E2EE_SEARCH_STORE).toBe('snapshot');
      expect(fileStoreSelected(dev.ROCKETCHAT_E2EE_SEARCH_STORE)).toBe(false);
    });

    it('drops undefined values from the worker env', () => {
      const env = { PATH: '/usr/bin', UNSET: undefined };
      expect(workerEnvOf(env, false)).toEqual({ PATH: '/usr/bin' });
    });

    it('searches with the snapshot store when the native module does not load, and keeps the saved snapshot', async () => {
      const args: WorkerOpenArgs = {
        userId: 'u1',
        dir,
        indexKey: { persistent: true, key: randomBytes(32), reset: false },
      };

      const before = handler();
      await request(before, 'open', [args]);
      await request(before, 'upsert', [[doc('old', 'savedzebra words')]]);
      expect(await request(before, 'save')).toMatchObject({ ok: true });
      await request(before, 'close');

      const fallbacks: unknown[] = [];
      const h = createWorkerHandler({
        DatabaseSync: RecordingDatabaseSync as unknown as typeof DatabaseSync,
        openEncryptedFile: nativeLoadFails,
        onFileStoreError: (error) => fallbacks.push(error),
      });
      expect(await request(h, 'open', [args])).toMatchObject({
        ok: true,
        value: { encryptedAtRest: true },
      });
      expect(fallbacks).toHaveLength(1);
      await request(h, 'upsert', [[doc('new', 'freshzebra words')]]);

      const ids = async (text: string) => {
        const response = await request(h, 'search', [{ text }]);
        expect(response).toMatchObject({ ok: true });
        return ((response as { value: { id: string }[] }).value ?? []).map(
          ({ id }) => id
        );
      };
      expect(await ids('freshzebra')).toEqual(['new']);
      expect(await ids('savedzebra')).toEqual(['old']);
      expect(await request(h, 'save')).toMatchObject({ ok: true });
      await request(h, 'close');
    });
  });
});
