import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import { createSearchEngine } from './engine';
import type { SearchEngine } from './engine';
import { summarizeError } from './errorSummary';
import { checkpointIndexFile, IndexFileRejectedError } from './fileStore';
import { INDEX_DB_FILE_NAME, removeIndexFiles } from './indexFiles';
import type { IndexKey } from './keyStore';
import {
  createSnapshotStore,
  removeStaleTempFiles,
  deserializeDatabase,
  serializeDatabase,
} from './snapshotStore';
import type { SnapshotStore } from './snapshotStore';
import type {
  E2EESearchDoc,
  E2EESearchQuery,
  E2EESearchRecentQuery,
  E2EESearchRoomState,
} from './types';
import type {
  WorkerOpenArgs,
  WorkerOpenResult,
  WorkerRequest,
  WorkerResponse,
} from './workerProtocol';

type FileStoreError = WorkerOpenResult['fileStoreError'];

// The codes of a native module that does not load (fileStore.ts loads it on
// the first open). Every folder fails the same way then.
const NATIVE_MODULE_ERROR_CODES = new Set([
  'ERR_DLOPEN_FAILED',
  'MODULE_NOT_FOUND',
]);

type OpenIndex = {
  db: DatabaseSync;
  store: WorkerOpenResult['store'];
  fileStoreError: FileStoreError;
  // From the key of the open that made the index. A later open with another
  // key does not change where the index lives.
  encryptedAtRest: boolean;
  engine: SearchEngine;
  save: () => Promise<void>;
};

type WorkerHandlerOptions = {
  DatabaseSync: typeof DatabaseSync;
  // The page-encrypted file store (fileStore.ts). When set, a persistent
  // key opens `index.db` with this function, and a save is a WAL checkpoint
  // of the changed pages. Without it, the database lives in memory and a
  // save writes the whole encrypted snapshot.
  openEncryptedFile?: (file: string, key: Buffer) => DatabaseSync;
  // Called when the file store cannot open. When the native SQLite module
  // does not load on this target, the handler uses the snapshot store for
  // every index for the life of the process. For another error, only the
  // index folder that failed uses it.
  onFileStoreError?: (error: unknown) => void;
};

// The file store is the default. `ROCKETCHAT_E2EE_SEARCH_STORE=snapshot`
// selects the memory database with the encrypted snapshot.
export const fileStoreSelected = (value: string | undefined): boolean =>
  value !== 'snapshot';

// The worker entry owns the structured clone of each request.
// After the handler answered an open, the handler keeps its own copy of the
// index key, so the entry zeroes the key of the request.
export const zeroRequestKey = (request: WorkerRequest): void => {
  if (request.method !== 'open') return;
  const key = (request.args[0] as WorkerOpenArgs | undefined)?.indexKey?.key;
  if (key instanceof Uint8Array) key.fill(0);
};

// The worker logic, with no Electron imports: the utility process entry and
// the specs both run it. With the file store, only page-encrypted pages
// reach the disk. With the snapshot store, the database lives in memory and
// only the encrypted snapshot reaches the disk.
export const createWorkerHandler = (options: WorkerHandlerOptions) => {
  const indexes = new Map<string, OpenIndex>();
  const lostIndexes = new Set<string>();
  // The copy of the index key of each open index.
  const indexKeys = new Map<string, Buffer>();
  let nativeModuleError: FileStoreError;
  // By index folder.
  const fileStoreErrors = new Map<string, NonNullable<FileStoreError>>();
  const fileStoreErrorOf = (dir: string): FileStoreError =>
    nativeModuleError ?? fileStoreErrors.get(dir);
  const withStore = (
    store: WorkerOpenResult['store'],
    fileStoreError: FileStoreError,
    result: Omit<WorkerOpenResult, 'store' | 'fileStoreError'>
  ): WorkerOpenResult => ({
    ...result,
    store,
    ...(store === 'snapshot' && fileStoreError && { fileStoreError }),
  });

  const get = (indexId: string): OpenIndex => {
    const index = indexes.get(indexId);
    if (!index) throw new Error(`E2EE search index is not open: ${indexId}`);
    return index;
  };

  const close = (indexId: string) => {
    indexes.get(indexId)?.db.close();
    indexes.delete(indexId);
    indexKeys.get(indexId)?.fill(0);
    indexKeys.delete(indexId);
  };

  const open = async (
    indexId: string,
    { userId, dir, indexKey }: WorkerOpenArgs
  ): Promise<WorkerOpenResult> => {
    // The index id names one folder and user, so a second open (a page
    // reload, another webview of the server) gets the same open index. A
    // reopen from the snapshot would drop the docs not saved yet.
    const current = indexes.get(indexId);
    if (current) {
      return withStore(current.store, current.fileStoreError, {
        schemaVersion: current.engine.schemaVersion,
        encryptedAtRest: current.encryptedAtRest,
      });
    }
    // Structured clone turns the Buffer into a plain Uint8Array.
    const key = { ...indexKey, key: Buffer.from(indexKey.key) };
    try {
      const result = await openWithKey(indexId, userId, dir, key);
      indexKeys.set(indexId, key.key);
      const indexLost = lostIndexes.delete(indexId);
      return { ...result, ...(indexLost && { indexLost: true as const }) };
    } catch (error) {
      // No open index uses the copy.
      key.key.fill(0);
      throw error;
    }
  };

  const openWithKey = async (
    indexId: string,
    userId: string,
    dir: string,
    key: IndexKey
  ): Promise<WorkerOpenResult> => {
    const store = createSnapshotStore({
      dir,
      indexKey: key,
      onRejected: () => lostIndexes.add(indexId),
    });
    const { openEncryptedFile } = options;
    if (openEncryptedFile && key.persistent && !fileStoreErrorOf(dir)) {
      const db = await openFileDb({
        indexId,
        dir,
        key: key.key,
        reset: key.reset,
        openEncryptedFile,
      });
      if (db) return startFileIndex(indexId, { userId, db, store });
    }
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
      if (engine.recreated) lostIndexes.add(indexId);
      const fileStoreError = fileStoreErrorOf(dir);
      indexes.set(indexId, {
        db,
        store: 'snapshot',
        fileStoreError,
        encryptedAtRest: key.persistent,
        engine,
        save: () => store.save(serializeDatabase(db)),
      });
      return withStore('snapshot', fileStoreError, {
        schemaVersion: engine.schemaVersion,
        encryptedAtRest: key.persistent,
      });
    } catch (error) {
      db.close();
      throw error;
    }
  };

  // Returns undefined when the file store cannot open. Then the caller uses
  // the snapshot store, and the saved snapshot stays on disk.
  const openFileDb = async ({
    indexId,
    dir,
    key,
    reset,
    openEncryptedFile,
  }: {
    indexId: string;
    dir: string;
    key: Buffer;
    reset: boolean;
    openEncryptedFile: (file: string, key: Buffer) => DatabaseSync;
  }): Promise<DatabaseSync | undefined> => {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await removeStaleTempFiles(dir);
    const file = path.join(dir, INDEX_DB_FILE_NAME);
    try {
      // A new key cannot read a file made with the old key.
      if (reset) await removeIndexFiles(file);
      try {
        return openEncryptedFile(file, key);
      } catch (error) {
        if (!(error instanceof IndexFileRejectedError)) throw error;
        if (
          await stat(file).then(
            () => true,
            () => false
          )
        )
          lostIndexes.add(indexId);
        // The index is a cache: a file that the key cannot read starts over.
        await removeIndexFiles(file);
        return openEncryptedFile(file, key);
      }
    } catch (error) {
      const summary = summarizeError(error);
      if (summary.code && NATIVE_MODULE_ERROR_CODES.has(summary.code)) {
        nativeModuleError = summary;
      } else {
        fileStoreErrors.set(dir, summary);
      }
      options.onFileStoreError?.(error);
      return undefined;
    }
  };

  const startFileIndex = async (
    indexId: string,
    {
      userId,
      db,
      store,
    }: { userId: string; db: DatabaseSync; store: SnapshotStore }
  ): Promise<WorkerOpenResult> => {
    try {
      const engine = createSearchEngine(db, { userId });
      if (engine.recreated) lostIndexes.add(indexId);
      // The snapshot of the memory store is a cache that this store does
      // not read. The crawler fills the file store again. Remove it only
      // after the file store opened, so a fallback still finds it.
      await store.remove();
      indexes.set(indexId, {
        db,
        store: 'file',
        fileStoreError: undefined,
        encryptedAtRest: true,
        engine,
        save: async () => checkpointIndexFile(db),
      });
      return withStore('file', undefined, {
        schemaVersion: engine.schemaVersion,
        encryptedAtRest: true,
      });
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
      case 'resetCheckpoints':
        get(indexId).db.exec('DELETE FROM room_state');
        return undefined;
      case 'save':
        await get(indexId).save();
        return undefined;
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
      case 'searchRecentPage':
        return get(indexId).engine.searchRecentPage(
          args[0] as E2EESearchRecentQuery
        );
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
