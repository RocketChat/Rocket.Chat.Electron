// The contract of `RocketChatDesktop.e2eeSearch`. Keep it in sync with the
// types in `@rocket.chat/desktop-api`.

export type E2EESearchDocKind = 'text' | 'file' | 'attachment';

export type E2EESearchDoc = {
  id: string;
  rid: string;
  tmid?: string;
  uid: string;
  username: string;
  ts: number;
  updatedAt: number;
  kind: E2EESearchDocKind;
  body: string;
};

export type E2EESearchQuery = {
  text: string;
  rid?: string;
  uid?: string;
  from?: number;
  to?: number;
  order?: 'relevance' | 'recent';
  limit?: number;
};

export type E2EESearchHit = {
  id: string;
  rid: string;
  tmid?: string;
  // The web client shows the author of each hit without a server request.
  uid: string;
  username: string;
  ts: number;
  // HTML: the message text is escaped, and only <mark> tags are added.
  snippet: string;
};

export type E2EESearchRecentCursor = { ts: number; id: string };

export type E2EESearchRecentQuery = Omit<E2EESearchQuery, 'order'> & {
  cursor?: E2EESearchRecentCursor;
};

export type E2EESearchRecentPage = {
  hits: E2EESearchHit[];
  nextCursor?: E2EESearchRecentCursor;
};

export type E2EESearchIndexEvent = { type: 'lost' } | { type: 'changed' };

export type E2EESearchCapabilities = {
  recentCursor: 1;
  lifecycleEvents: 1;
  close: 1;
};

export type E2EESearchRoomState = {
  lastUpdate?: number;
  backfillCursor?: string;
  backfillDone: boolean;
};

export type E2EESearchStats = { docs: number; bytes: number; rooms: number };

// One server in Settings. `docs` is undefined when no index of the server is
// open. `serverUrl` is undefined for a folder of a server that is gone.
export type E2EESearchServerIndexStats = {
  serverUrl?: string;
  users: number;
  docs?: number;
  bytesOnDisk: number;
  atRest: 'encrypted' | 'memory-only' | 'mixed';
  // From the open indexes of the server. `snapshot` when any of them runs on
  // the snapshot store. `limitedReason` says why an index is limited.
  store?: 'file' | 'snapshot';
  limitedReason?: E2EESearchLimitReason;
};

export type E2EESearchLimitReason =
  | 'no-encryption'
  | 'basic-text-backend'
  | 'keychain-timeout'
  | 'hard-coded-wrap'
  | 'native-module-unavailable';

export type E2EESearchOpenResult = {
  schemaVersion: number;
  encryptedAtRest: boolean;
  store?: 'file' | 'snapshot';
  limitedReason?: E2EESearchLimitReason;
  capabilities?: E2EESearchCapabilities;
  // True when the open had no wrap key, and the server holds an
  // E2EE key for the user or cannot tell. No index opened and nothing was
  // written. An open with the wrap key (after E2EE unlock) opens the sealed
  // index.
  locked?: true;
};

export type E2EESearchScope = {
  userId: string;
  // 32 bytes that the web client derives from the user's
  // E2EE private key, never the private key itself. With it, the index opens
  // only with the same key. A server without the web-client change sends none.
  wrapKey?: Uint8Array;
};

export type SearchIndexBackend = {
  open(scope: E2EESearchScope): Promise<E2EESearchOpenResult>;
  upsert(docs: E2EESearchDoc[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  removeRoom(rid: string): Promise<void>;
  // The rooms that have rows in the index. The web client removes the rooms
  // that the user left while the index was closed.
  listRooms(): Promise<string[]>;
  search(query: E2EESearchQuery): Promise<E2EESearchHit[]>;
  searchRecentPage(query: E2EESearchRecentQuery): Promise<E2EESearchRecentPage>;
  onIndexEvent(listener: (event: E2EESearchIndexEvent) => void): () => void;
  getRoomState(rid: string): Promise<E2EESearchRoomState | undefined>;
  setRoomState(rid: string, state: E2EESearchRoomState): Promise<void>;
  stats(): Promise<E2EESearchStats>;
  // With a scope and no open index (E2EE locked), the server-confirmed
  // user's index is deleted.
  wipe(scope?: { userId: string }): Promise<void>;
  // The web client calls it at logout. The index closes and stays on disk.
  // The web client must check that the method exists, because an older
  // desktop app does not have it.
  close(): Promise<void>;
};
