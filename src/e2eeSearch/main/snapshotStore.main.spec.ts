import { randomBytes } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchEngine } from '../engine';
import type { IndexKey } from '../keyStore';
import {
  createSnapshotStore,
  deserializeDatabase,
  serializeDatabase,
  SNAPSHOT_FILE_NAME,
  SnapshotRejectedError,
} from '../snapshotStore';

// Loaded at runtime: the Jest resolver does not know the prefix-only
// `node:sqlite` builtin.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const NEEDLE = 'xylophonezebra';

const persistentKey = (reset = false): IndexKey => ({
  persistent: true,
  key: randomBytes(32),
  reset,
});

const indexWithNeedle = () => {
  const db = new DatabaseSync(':memory:');
  const engine = createSearchEngine(db, { userId: 'me' });
  engine.upsert(
    Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      rid: 'r1',
      uid: 'u1',
      username: 'ana',
      ts: 1000 + i,
      updatedAt: 1000 + i,
      kind: 'text' as const,
      body: i % 5 === 0 ? `the ${NEEDLE} is here` : `plain message ${i}`,
    }))
  );
  return { db, engine };
};

const searchIds = (db: InstanceType<typeof DatabaseSync>) =>
  createSearchEngine(db, { userId: 'me' })
    .search({ text: NEEDLE })
    .map((hit) => hit.id)
    .sort();

describe('e2eeSearch snapshot store', () => {
  let dir: string;
  const file = () => path.join(dir, SNAPSHOT_FILE_NAME);

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'e2ee-snap-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round trips the bytes and starts with the RCES header', async () => {
    const indexKey = persistentKey();
    const store = createSnapshotStore({ dir, indexKey });
    const plain = randomBytes(4096);

    expect(await store.load()).toBeUndefined();
    await store.save(plain);

    const onDisk = await readFile(file());
    expect(onDisk.subarray(0, 5)).toEqual(
      Buffer.concat([Buffer.from('RCES'), Buffer.from([1])])
    );
    expect(onDisk).toHaveLength(5 + 12 + plain.length + 16);
    expect(Buffer.from((await store.load())!)).toEqual(plain);
  });

  it.each([
    ['a flipped ciphertext byte', (data: Buffer) => data[40]++],
    ['a flipped header byte', (data: Buffer) => data[4]++],
    ['a flipped tag byte', (data: Buffer) => data[data.length - 1]++],
  ])('rejects %s and deletes the file', async (_name, tamper) => {
    const indexKey = persistentKey();
    await createSnapshotStore({ dir, indexKey }).save(randomBytes(256));
    const data = await readFile(file());
    tamper(data);
    await writeFile(file(), data);

    const onRejected = jest.fn();
    const store = createSnapshotStore({ dir, indexKey, onRejected });
    expect(await store.load()).toBeUndefined();
    expect(onRejected).toHaveBeenCalledWith(expect.any(SnapshotRejectedError));
    expect(await readdir(dir)).toEqual([]);
  });

  it('rejects a snapshot read with the wrong key', async () => {
    await createSnapshotStore({ dir, indexKey: persistentKey() }).save(
      randomBytes(256)
    );
    const onRejected = jest.fn();
    const store = createSnapshotStore({
      dir,
      indexKey: persistentKey(),
      onRejected,
    });
    expect(await store.load()).toBeUndefined();
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it.each([0, 10, -1])(
    'rejects a file truncated to length %i (negative: from the end)',
    async (length) => {
      const indexKey = persistentKey();
      await createSnapshotStore({ dir, indexKey }).save(randomBytes(256));
      const data = await readFile(file());
      await writeFile(file(), data.subarray(0, length));

      const onRejected = jest.fn();
      const store = createSnapshotStore({ dir, indexKey, onRejected });
      expect(await store.load()).toBeUndefined();
      expect(onRejected).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps the last good snapshot when a crash leaves a partial temp file', async () => {
    const indexKey = persistentKey();
    const store = createSnapshotStore({ dir, indexKey });
    const good = randomBytes(512);
    await store.save(good);

    // What a crash between the temp write and the rename leaves behind.
    await writeFile(
      `${file()}.12345.${Date.now()}.tmp`,
      (await readFile(file())).subarray(0, 100)
    );

    expect(Buffer.from((await store.load())!)).toEqual(good);
  });

  it('writes no plaintext and restores the same search results', async () => {
    const { db, engine } = indexWithNeedle();
    const before = searchIds(db);
    expect(before).toEqual(['m0', 'm10', 'm15', 'm5']);
    const plain = serializeDatabase(db);
    expect(Buffer.from(plain).includes(NEEDLE)).toBe(true);

    const indexKey = persistentKey();
    await createSnapshotStore({ dir, indexKey }).save(plain);
    engine.wipe();

    const written = await Promise.all(
      (await readdir(dir)).map((name) => readFile(path.join(dir, name)))
    );
    expect(written).toHaveLength(1);
    for (const bytes of written) {
      expect(bytes.includes(NEEDLE)).toBe(false);
      expect(bytes.includes('plain message')).toBe(false);
    }

    const restored = new DatabaseSync(':memory:');
    deserializeDatabase(
      restored,
      (await createSnapshotStore({ dir, indexKey }).load())!
    );
    expect(searchIds(restored)).toEqual(before);
  });

  it('writes nothing for a memory-only key', async () => {
    const store = createSnapshotStore({
      dir,
      indexKey: {
        persistent: false,
        key: randomBytes(32),
        reason: 'basic-text-backend',
      },
    });
    await store.save(randomBytes(256));
    expect(await readdir(dir)).toEqual([]);
    expect(await store.load()).toBeUndefined();
  });

  it('discards the old snapshot after a key reset and starts empty', async () => {
    await createSnapshotStore({ dir, indexKey: persistentKey() }).save(
      randomBytes(256)
    );
    const indexKey = persistentKey(true);
    const onRejected = jest.fn();
    const store = createSnapshotStore({ dir, indexKey, onRejected });

    expect(await store.load()).toBeUndefined();
    expect(onRejected).not.toHaveBeenCalled();
    expect(await readdir(dir)).toEqual([]);

    // After the first save, the same store reads its new snapshot back.
    const plain = randomBytes(128);
    await store.save(plain);
    expect(Buffer.from((await store.load())!)).toEqual(plain);
  });

  describe('stale temp files', () => {
    const stale = () => `${file()}.99999.1.tmp`;

    it('removes a stale temp file on load and keeps the snapshot', async () => {
      const indexKey = persistentKey();
      const store = createSnapshotStore({ dir, indexKey });
      await store.save(randomBytes(256));
      await writeFile(stale(), 'half written');

      expect(await store.load()).toBeDefined();
      expect((await readdir(dir)).sort()).toEqual([SNAPSHOT_FILE_NAME]);
    });

    it('removes a stale temp file on remove', async () => {
      const store = createSnapshotStore({ dir, indexKey: persistentKey() });
      await writeFile(stale(), 'half written');
      await store.remove();
      expect(await readdir(dir)).toEqual([]);
    });

    it('keeps the temp file of a save in progress', async () => {
      const store = createSnapshotStore({ dir, indexKey: persistentKey() });
      const saving = store.save(randomBytes(8 * 1024 * 1024));
      // The temp file exists before the write ends.
      await new Promise((resolve) => setImmediate(resolve));
      await store.remove();
      await saving;
      expect(await readdir(dir)).toEqual([SNAPSHOT_FILE_NAME]);
    });
  });
});
