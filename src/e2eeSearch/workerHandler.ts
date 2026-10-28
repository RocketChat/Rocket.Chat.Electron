import type { DatabaseSync } from 'node:sqlite';

import { createSearchEngine } from './engine';
import type { SearchEngine } from './engine';
import {
  createSnapshotStore,
  deserializeDatabase,
  serializeDatabase,
} from './snapshotStore';
import type { SnapshotStore } from './snapshotStore';
import type {
  E2EESearchDoc,
  E2EESearchOpenResult,
  E2EESearchQuery,
  E2EESearchRoomState,
} from './types';
import type {
  WorkerOpenArgs,
  WorkerRequest,
  WorkerResponse,
} from './workerProtocol';

type OpenIndex = {
  db: DatabaseSync;
  engine: SearchEngine;
  store: SnapshotStore;
};

type WorkerHandlerOptions = {
  DatabaseSync: typeof DatabaseSync;
};

// The worker logic, with no Electron imports: the utility process entry and
// the specs both run it. The database lives in memory. Only the encrypted
// snapshot reaches the disk.
export const createWorkerHandler = (options: WorkerHandlerOptions) => {
  const indexes = new Map<string, OpenIndex>();

  const get = (indexId: string): OpenIndex => {
    const index = indexes.get(indexId);
    if (!index) throw new Error(`E2EE search index is not open: ${indexId}`);
    return index;
  };

  const close = (indexId: string) => {
    indexes.get(indexId)?.db.close();
    indexes.delete(indexId);
  };

  const open = async (
    indexId: string,
    { userId, dir, indexKey }: WorkerOpenArgs
  ): Promise<E2EESearchOpenResult> => {
    // The index id names one folder and user, so a second open (a page
    // reload, another webview of the server) gets the same open index. A
    // reopen from the snapshot would drop the docs not saved yet.
    const current = indexes.get(indexId);
    if (current) {
      return {
        schemaVersion: current.engine.schemaVersion,
        encryptedAtRest: indexKey.persistent,
      };
    }
    // Structured clone turns the Buffer into a plain Uint8Array.
    const key = { ...indexKey, key: Buffer.from(indexKey.key) };
    const store = createSnapshotStore({ dir, indexKey: key });
    const db = new options.DatabaseSync(':memory:');
    try {
      // Keep sort runs and temp tables in memory too. With the default,
      // SQLite can spill plaintext message text to files in the OS temp
      // folder. `deserialize` keeps this connection setting.
      db.exec('PRAGMA temp_store = MEMORY');
      const snapshot = await store.load();
      if (snapshot) deserializeDatabase(db, snapshot);
      // The snapshot is the serialized database, free pages included. Zero
      // the content that a wipe, remove or edit frees, so the text does not
      // stay in index.bin. Set it after `deserialize`, which resets it.
      db.exec('PRAGMA secure_delete = ON');
      const engine = createSearchEngine(db, { userId });
      indexes.set(indexId, { db, engine, store });
      return {
        schemaVersion: engine.schemaVersion,
        encryptedAtRest: key.persistent,
      };
    } catch (error) {
      db.close();
      throw error;
    }
  };

  const run = async ({
    indexId,
    method,
    args,
  }: WorkerRequest): Promise<unknown> => {
    switch (method) {
      case 'open':
        return open(indexId, args[0] as WorkerOpenArgs);
      case 'close':
        close(indexId);
        return undefined;
      case 'save': {
        const { db, store } = get(indexId);
        await store.save(serializeDatabase(db));
        return undefined;
      }
      case 'upsert':
        return get(indexId).engine.upsert(args[0] as E2EESearchDoc[]);
      case 'remove':
        return get(indexId).engine.remove(args[0] as string[]);
      case 'removeRoom':
        return get(indexId).engine.removeRoom(args[0] as string);
      case 'listRooms':
        return get(indexId).engine.listRooms();
      case 'search':
        return get(indexId).engine.search(args[0] as E2EESearchQuery);
      case 'getRoomState':
        return get(indexId).engine.getRoomState(args[0] as string);
      case 'setRoomState':
        return get(indexId).engine.setRoomState(
          args[0] as string,
          args[1] as E2EESearchRoomState
        );
      case 'stats':
        return get(indexId).engine.stats();
      case 'wipe':
        return get(indexId).engine.wipe();
      default:
        throw new Error(`Unknown E2EE search method: ${String(method)}`);
    }
  };

  return {
    async handle(request: WorkerRequest): Promise<WorkerResponse> {
      try {
        return { id: request.id, ok: true, value: await run(request) };
      } catch (error) {
        const { name, message } =
          error instanceof Error ? error : new Error(String(error));
        return { id: request.id, ok: false, error: { name, message } };
      }
    },
  };
};
