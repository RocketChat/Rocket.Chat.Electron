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
});
