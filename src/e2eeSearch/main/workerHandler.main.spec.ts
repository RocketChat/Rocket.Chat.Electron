import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

import { createWorkerHandler } from '../workerHandler';
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
});
