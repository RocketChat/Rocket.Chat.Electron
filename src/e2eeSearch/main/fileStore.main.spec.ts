import { createHash, randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-multiple-ciphers';

import { openEncryptedIndexFile } from '../fileStore';
import { INDEX_DB_FILE_NAME } from '../indexFiles';
import { SNAPSHOT_FILE_NAME } from '../snapshotStore';
import type { E2EESearchHit } from '../types';
import { createWorkerHandler } from '../workerHandler';
import type { WorkerOpenArgs, WorkerRequest } from '../workerProtocol';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const NEEDLE = 'zebracornneedle';

const docs = (prefix: string, count = 50) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    rid: 'r1',
    uid: 'u1',
    username: 'ana',
    ts: 1000 + i,
    updatedAt: 1000 + i,
    kind: 'text',
    body: `${prefix}${NEEDLE} ${i} ${'padding words '.repeat(8)}`,
  }));

describe('E2EE search worker handler, encrypted file store', () => {
  let dir: string;
  let nextId = 0;
  const handler = () =>
    createWorkerHandler({
      DatabaseSync,
      openEncryptedFile: openEncryptedIndexFile,
    });
  const call = async (
    h: ReturnType<typeof handler>,
    method: WorkerRequest['method'],
    args: unknown[] = []
  ) => {
    nextId += 1;
    const response = await h.handle({
      id: nextId,
      indexId: 'i1',
      method,
      args,
    });
    if (!response.ok) throw new Error(`${method}: ${response.error.message}`);
    return response.value;
  };
  const searchIds = async (h: ReturnType<typeof handler>, text: string) =>
    ((await call(h, 'search', [{ text }])) as E2EESearchHit[]).map(
      (hit) => hit.id
    );
  const filesWithNeedle = () =>
    readdirSync(dir).filter((name) =>
      readFileSync(path.join(dir, name)).includes(NEEDLE)
    );

  let args: WorkerOpenArgs;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'e2ee-file-store-'));
    args = {
      userId: 'u1',
      dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps the index in an encrypted file across a reopen, with no plaintext in any file', async () => {
    const writer = handler();
    expect(await call(writer, 'open', [args])).toMatchObject({
      encryptedAtRest: true,
    });
    await call(writer, 'upsert', [docs('a')]);
    await call(writer, 'save');
    // Live files (db and WAL) after a save hold only ciphertext.
    expect(existsSync(path.join(dir, INDEX_DB_FILE_NAME))).toBe(true);
    expect(filesWithNeedle()).toEqual([]);
    await call(writer, 'close');
    expect(existsSync(path.join(dir, SNAPSHOT_FILE_NAME))).toBe(false);
    expect(filesWithNeedle()).toEqual([]);

    const reader = handler();
    await call(reader, 'open', [args]);
    expect((await searchIds(reader, `a${NEEDLE}`)).length).toBe(50);
    await call(reader, 'close');
  });

  // Control: the same writes with no key leave the needle on disk, so the
  // clean scan above is about the encryption.
  it('control: an unkeyed SQLite file of the same docs shows the needle', () => {
    const file = path.join(dir, 'plain.db');
    const plain = new Database(file);
    plain.exec('CREATE TABLE t (body TEXT)');
    const insert = plain.prepare('INSERT INTO t (body) VALUES (?)');
    for (const doc of docs('a')) insert.run(doc.body);
    plain.close();
    expect(filesWithNeedle()).toEqual(['plain.db']);
  });

  it('starts over when the key cannot read the file', async () => {
    const first = handler();
    await call(first, 'open', [args]);
    await call(first, 'upsert', [docs('a')]);
    await call(first, 'save');
    await call(first, 'close');

    const other: WorkerOpenArgs = {
      ...args,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };
    const second = handler();
    await call(second, 'open', [other]);
    expect(await searchIds(second, `a${NEEDLE}`)).toEqual([]);
    await call(second, 'upsert', [docs('b', 1)]);
    expect(await searchIds(second, `b${NEEDLE}`)).toEqual(['b0']);
    await call(second, 'close');
  });

  it('drops the old file on a key reset, and the old snapshot on open', async () => {
    const first = handler();
    await call(first, 'open', [args]);
    await call(first, 'upsert', [docs('a')]);
    await call(first, 'close');
    writeFileSync(path.join(dir, SNAPSHOT_FILE_NAME), 'old snapshot');

    const second = handler();
    await call(second, 'open', [
      { ...args, indexKey: { ...args.indexKey, reset: true } },
    ]);
    expect(existsSync(path.join(dir, SNAPSHOT_FILE_NAME))).toBe(false);
    expect(await searchIds(second, `a${NEEDLE}`)).toEqual([]);
    await call(second, 'close');
  });

  it('leaves no removed or wiped text in the file', async () => {
    const h = handler();
    await call(h, 'open', [args]);
    await call(h, 'upsert', [docs('rm')]);
    await call(h, 'save');
    await call(h, 'remove', [docs('rm').map(({ id }) => id)]);
    await call(h, 'upsert', [docs('wp')]);
    await call(h, 'wipe');
    await call(h, 'save');
    await call(h, 'close');

    // Read the decrypted pages: free pages included, no needle remains.
    const db = new Database(path.join(dir, INDEX_DB_FILE_NAME));
    db.pragma("cipher='chacha20'");
    db.pragma(`hexkey='${Buffer.from(args.indexKey.key).toString('hex')}'`);
    const pages = db.prepare('PRAGMA page_count').pluck().get() as number;
    expect(pages).toBeGreaterThan(0);
    const serialized = db.serialize();
    db.close();
    expect(serialized.includes(NEEDLE)).toBe(false);
  });

  // The file size follows the index size. Local disk access is outside the
  // E2EE threat model, so the store does not hide it.
  it('keeps the file of a small index below 1 MiB', async () => {
    const h = handler();
    await call(h, 'open', [args]);
    await call(h, 'upsert', [docs('a')]);
    await call(h, 'save');
    await call(h, 'close');
    expect(statSync(path.join(dir, INDEX_DB_FILE_NAME)).size).toBeLessThan(
      1024 * 1024
    );
  });

  it('keeps the memory snapshot path for a memory-only key', async () => {
    const h = handler();
    await call(h, 'open', [
      { ...args, indexKey: { ...args.indexKey, persistent: false } },
    ]);
    await call(h, 'upsert', [docs('a', 1)]);
    await call(h, 'save');
    await call(h, 'close');
    expect(readdirSync(dir)).toEqual([]);
  });

  describe('a file store that does not open', () => {
    let otherDir: string;
    beforeEach(() => {
      otherDir = mkdtempSync(path.join(tmpdir(), 'e2ee-file-store-other-'));
    });
    afterEach(() => {
      rmSync(otherDir, { recursive: true, force: true });
    });

    const openIn = async (
      h: ReturnType<typeof handler>,
      indexId: string,
      indexDir: string
    ) => {
      nextId += 1;
      const response = await h.handle({
        id: nextId,
        indexId,
        method: 'open',
        args: [{ ...args, dir: indexDir }],
      });
      if (!response.ok) throw new Error(`open: ${response.error.message}`);
      return response.value;
    };
    const failingIn =
      (failDir: string, error: Error) => (file: string, key: Buffer) => {
        if (file.startsWith(failDir + path.sep)) throw error;
        return openEncryptedIndexFile(file, key);
      };

    it('falls back for that folder only, when the native module loads', async () => {
      const cantOpen = Object.assign(new Error('unable to open'), {
        code: 'SQLITE_CANTOPEN',
      });
      const h = createWorkerHandler({
        DatabaseSync,
        openEncryptedFile: failingIn(otherDir, cantOpen),
      });

      expect(await openIn(h, 'bad', otherDir)).toMatchObject({
        store: 'snapshot',
        fileStoreError: { code: 'SQLITE_CANTOPEN' },
      });
      const good = await openIn(h, 'good', dir);
      expect(good).toMatchObject({ store: 'file' });
      expect(good).not.toHaveProperty('fileStoreError');
      expect(await openIn(h, 'bad', otherDir)).toMatchObject({
        store: 'snapshot',
        fileStoreError: { code: 'SQLITE_CANTOPEN' },
      });
    });

    it.each(['ERR_DLOPEN_FAILED', 'MODULE_NOT_FOUND'])(
      'falls back for every folder when the native module does not load (%s)',
      async (code) => {
        const notLoaded = Object.assign(new Error('native module'), { code });
        const h = createWorkerHandler({
          DatabaseSync,
          openEncryptedFile: failingIn(otherDir, notLoaded),
        });

        await openIn(h, 'bad', otherDir);
        expect(await openIn(h, 'good', dir)).toMatchObject({
          store: 'snapshot',
          fileStoreError: { code },
        });
      }
    );
  });

  // A memory-only open (the dev switch, or no keychain for a
  // while) leaves the encrypted index of a persistent key on disk.
  describe('a memory-only open after a persistent index', () => {
    const memoryOnly = () => ({
      ...args,
      indexKey: {
        persistent: false as const,
        key: randomBytes(32),
        reason: 'no-encryption' as const,
      },
    });
    const filesOf = () =>
      Object.fromEntries(
        readdirSync(dir).map((name) => [
          name,
          createHash('sha256')
            .update(readFileSync(path.join(dir, name)))
            .digest('hex'),
        ])
      );

    it('keeps the snapshot of the snapshot store', async () => {
      const snapshotHandler = () => createWorkerHandler({ DatabaseSync });
      const first = snapshotHandler();
      await call(first, 'open', [args]);
      await call(first, 'upsert', [docs('a', 1)]);
      await call(first, 'save');
      await call(first, 'close');
      const before = filesOf();
      expect(Object.keys(before)).toEqual([SNAPSHOT_FILE_NAME]);

      const memory = snapshotHandler();
      await call(memory, 'open', [memoryOnly()]);
      expect(await searchIds(memory, `a${NEEDLE}`)).toEqual([]);
      await call(memory, 'upsert', [docs('m', 1)]);
      await call(memory, 'save');
      await call(memory, 'close');
      expect(filesOf()).toEqual(before);

      const again = snapshotHandler();
      await call(again, 'open', [args]);
      expect(await searchIds(again, `a${NEEDLE}`)).toEqual(['a0']);
      await call(again, 'close');
    });

    it('keeps the database file of the file store', async () => {
      const first = handler();
      await call(first, 'open', [args]);
      await call(first, 'upsert', [docs('a', 1)]);
      await call(first, 'save');
      await call(first, 'close');
      const before = filesOf();
      expect(Object.keys(before)).toContain(INDEX_DB_FILE_NAME);

      const memory = handler();
      await call(memory, 'open', [memoryOnly()]);
      await call(memory, 'upsert', [docs('m', 1)]);
      await call(memory, 'save');
      await call(memory, 'close');
      expect(filesOf()).toEqual(before);

      const again = handler();
      await call(again, 'open', [args]);
      expect(await searchIds(again, `a${NEEDLE}`)).toEqual(['a0']);
      await call(again, 'close');
    });
  });
});
