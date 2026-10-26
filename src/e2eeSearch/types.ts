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
};

export type E2EESearchOpenResult = {
  schemaVersion: number;
  encryptedAtRest: boolean;
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
  search(query: E2EESearchQuery): Promise<E2EESearchHit[]>;
  getRoomState(rid: string): Promise<E2EESearchRoomState | undefined>;
  setRoomState(rid: string, state: E2EESearchRoomState): Promise<void>;
  stats(): Promise<E2EESearchStats>;
  wipe(): Promise<void>;
};
