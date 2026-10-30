import type { IndexKey } from './keyStore';
import type { E2EESearchOpenResult } from './types';

// Messages between the main-process host and the utility process worker.
// Each index has its own id, so one worker serves every open index.

export type WorkerOpenArgs = {
  userId: string;
  dir: string;
  indexKey: IndexKey;
};

// The worker also says which store holds the index, so the main process can
// log it. `fileStoreError` is set when the file store did not open and the
// worker uses the snapshot store. It holds only the error name and code.
export type WorkerOpenResult = E2EESearchOpenResult & {
  store: 'file' | 'snapshot';
  fileStoreError?: { name: string; code?: string };
  indexLost?: true;
};

export type WorkerMethod =
  | 'open'
  | 'upsert'
  | 'remove'
  | 'removeRoom'
  | 'listRooms'
  | 'search'
  | 'searchRecentPage'
  | 'getRoomState'
  | 'setRoomState'
  | 'stats'
  | 'wipe'
  | 'save'
  | 'resetCheckpoints'
  | 'close';

// The methods that change the index. The host saves a snapshot after them.
export const MUTATING_METHODS: ReadonlySet<WorkerMethod> = new Set([
  'upsert',
  'remove',
  'removeRoom',
  'setRoomState',
  'wipe',
  'resetCheckpoints',
]);

export type WorkerRequest = {
  id: number;
  indexId: string;
  method: WorkerMethod;
  args: unknown[];
};

export type WorkerResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: { name: string; message: string } };
