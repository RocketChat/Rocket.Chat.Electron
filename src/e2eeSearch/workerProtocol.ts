import type { IndexKey } from './keyStore';

// Messages between the main-process host and the utility process worker.
// Each index has its own id, so one worker serves every open index.

export type WorkerOpenArgs = {
  userId: string;
  dir: string;
  indexKey: IndexKey;
};

export type WorkerMethod =
  | 'open'
  | 'upsert'
  | 'remove'
  | 'removeRoom'
  | 'listRooms'
  | 'search'
  | 'getRoomState'
  | 'setRoomState'
  | 'stats'
  | 'wipe'
  | 'save'
  | 'close';

// The methods that change the index. The host saves a snapshot after them.
export const MUTATING_METHODS: ReadonlySet<WorkerMethod> = new Set([
  'upsert',
  'remove',
  'removeRoom',
  'setRoomState',
  'wipe',
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
