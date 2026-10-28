import type { DatabaseSync } from 'node:sqlite';

import { toMatch } from './sanitize';
import {
  DROP_SQL,
  SCHEMA_SQL,
  SCHEMA_VERSION,
  SEARCH_BY_RECENT_SQL,
  SEARCH_BY_RELEVANCE_SQL,
  SEARCH_FILTERS_ONLY_SQL,
  SEARCH_UNFILTERED_BY_RELEVANCE_SQL,
} from './schema';
import type {
  E2EESearchDoc,
  E2EESearchHit,
  E2EESearchQuery,
  E2EESearchRoomState,
  E2EESearchStats,
} from './types';
import { E2EESearchQuotaError, MAX_SEARCH_LIMIT } from './validate';

export const DEFAULT_SEARCH_LIMIT = 50;
export { MAX_SEARCH_LIMIT };
// Total caps for one index. A benchmark of the engine
// measured 500,000 docs at 144.5 MB, so a real user stays below both.
export const MAX_INDEX_DOCS = 500_000;
export const MAX_INDEX_BYTES = 256 * 1024 * 1024;
// A room_state row holds at most ~1.2 KB (rid and cursor are capped).
export const MAX_INDEX_ROOMS = 50_000;

export type SearchEngine = {
  readonly schemaVersion: number;
  upsert(docs: E2EESearchDoc[]): void;
  remove(ids: string[]): void;
  removeRoom(rid: string): void;
  // The rooms that have rows in the index, sorted.
  listRooms(): string[];
  search(query: E2EESearchQuery): E2EESearchHit[];
  getRoomState(rid: string): E2EESearchRoomState | undefined;
  setRoomState(rid: string, state: E2EESearchRoomState): void;
  stats(): E2EESearchStats;
  wipe(): void;
  checkIntegrity(): void;
};

type MessageRow = {
  id: string;
  rid: string;
  tmid: string | null;
  uid: string;
  username: string;
  ts: number;
  snippet: string;
};

type RoomStateRow = {
  last_update: number | null;
  backfill_cursor: string | null;
  backfill_done: number;
};

const readMeta = (db: DatabaseSync, key: string): string | undefined => {
  const hasMeta = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta'"
    )
    .get();
  if (!hasMeta) return undefined;
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
};

const createSchema = (db: DatabaseSync, userId: string): void => {
  db.exec(DROP_SQL);
  db.exec(SCHEMA_SQL);
  const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  insertMeta.run('schema_version', String(SCHEMA_VERSION));
  insertMeta.run('user_id', userId);
};

// snippet() wraps each match in these private-use characters, not in HTML.
// The engine escapes the message text and then swaps the markers for its own
// <mark> tags, so text from other users never reaches the page as HTML.
// Upsert strips the markers from the text, so the text cannot add a mark.
const MARK_OPEN = '\uE000';
const MARK_CLOSE = '\uE001';
const MARKERS = /[\uE000\uE001]/g;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const toSnippetHtml = (raw: string): string =>
  raw
    .replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
    .replaceAll(MARK_OPEN, '<mark>')
    .replaceAll(MARK_CLOSE, '</mark>');

const clampLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(limit)));
};

// The engine runs synchronous node:sqlite calls. It has no Electron imports,
// so a utility process (desktop) or a test can host it. The index is a cache:
// a database of another schema version or another user is dropped and rebuilt.
export const createSearchEngine = (
  db: DatabaseSync,
  {
    userId,
    maxDocs = MAX_INDEX_DOCS,
    maxBytes = MAX_INDEX_BYTES,
    maxRooms = MAX_INDEX_ROOMS,
  }: {
    userId: string;
    maxDocs?: number;
    maxBytes?: number;
    maxRooms?: number;
  }
): SearchEngine => {
  const inTransaction = (work: () => void): void => {
    db.exec('BEGIN');
    try {
      work();
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  const ensureSchema = (): void => {
    if (
      readMeta(db, 'schema_version') !== String(SCHEMA_VERSION) ||
      readMeta(db, 'user_id') !== userId
    ) {
      inTransaction(() => createSchema(db, userId));
    }
  };

  ensureSchema();

  const upsertMessage = db.prepare(`
    INSERT INTO messages (id, rid, tmid, uid, username, ts, updated_at, kind, body)
    VALUES (:id, :rid, :tmid, :uid, :username, :ts, :updatedAt, :kind, :body)
    ON CONFLICT (id) DO UPDATE SET
      rid = excluded.rid,
      tmid = excluded.tmid,
      uid = excluded.uid,
      username = excluded.username,
      ts = excluded.ts,
      updated_at = excluded.updated_at,
      kind = excluded.kind,
      body = excluded.body
    WHERE excluded.updated_at >= messages.updated_at
      AND (rid, tmid, uid, username, ts, updated_at, kind, body) IS NOT
        (excluded.rid, excluded.tmid, excluded.uid, excluded.username,
         excluded.ts, excluded.updated_at, excluded.kind, excluded.body)
  `);
  const deletePending = db.prepare('DELETE FROM pending_decrypt WHERE id = ?');
  const deleteMessage = db.prepare('DELETE FROM messages WHERE id = ?');
  const countDocs = db.prepare('SELECT count(*) AS docs FROM messages');
  // Free pages (after a delete or a rolled-back upsert) are room for new docs.
  const usedBytes = db.prepare(
    'SELECT (page_count - freelist_count) * page_size AS bytes FROM pragma_page_count(), pragma_freelist_count(), pragma_page_size()'
  );

  const countRooms = db.prepare('SELECT count(*) AS rooms FROM room_state');

  const checkBytes = (): void => {
    const { bytes } = usedBytes.get() as { bytes: number };
    if (bytes > maxBytes) {
      throw new E2EESearchQuotaError(
        `E2EE search index is larger than ${maxBytes} bytes`
      );
    }
  };

  // Runs inside the upsert transaction, so a throw rolls the batch back.
  const checkCaps = (): void => {
    const { docs } = countDocs.get() as { docs: number };
    if (docs > maxDocs) {
      throw new E2EESearchQuotaError(
        `E2EE search index has more than ${maxDocs} docs`
      );
    }
    checkBytes();
  };

  // Runs inside the setRoomState transaction, so a throw rolls the row back.
  const checkRoomCaps = (): void => {
    const { rooms } = countRooms.get() as { rooms: number };
    if (rooms > maxRooms) {
      throw new E2EESearchQuotaError(
        `E2EE search index has more than ${maxRooms} rooms`
      );
    }
    checkBytes();
  };
  const upsertRoomState = db.prepare(
    `INSERT INTO room_state (rid, last_update, backfill_cursor, backfill_done)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (rid) DO UPDATE SET
       last_update = excluded.last_update,
       backfill_cursor = excluded.backfill_cursor,
       backfill_done = excluded.backfill_done`
  );
  const searchByRelevance = db.prepare(SEARCH_BY_RELEVANCE_SQL);
  const searchByRecent = db.prepare(SEARCH_BY_RECENT_SQL);
  const searchUnfilteredByRelevance = db.prepare(
    SEARCH_UNFILTERED_BY_RELEVANCE_SQL
  );
  const searchFiltersOnly = db.prepare(SEARCH_FILTERS_ONLY_SQL);

  return {
    schemaVersion: SCHEMA_VERSION,

    upsert(docs) {
      inTransaction(() => {
        for (const doc of docs) {
          upsertMessage.run({
            id: doc.id,
            rid: doc.rid,
            tmid: doc.tmid ?? null,
            uid: doc.uid,
            username: doc.username,
            ts: doc.ts,
            updatedAt: doc.updatedAt,
            kind: doc.kind,
            body: doc.body.replace(MARKERS, ''),
          });
          deletePending.run(doc.id);
        }
        checkCaps();
      });
    },

    remove(ids) {
      inTransaction(() => {
        for (const id of ids) {
          deleteMessage.run(id);
          deletePending.run(id);
        }
      });
    },

    removeRoom(rid) {
      inTransaction(() => {
        db.prepare('DELETE FROM messages WHERE rid = ?').run(rid);
        db.prepare('DELETE FROM room_state WHERE rid = ?').run(rid);
        db.prepare('DELETE FROM pending_decrypt WHERE rid = ?').run(rid);
      });
    },

    listRooms() {
      const rows = db
        .prepare(
          'SELECT rid FROM messages UNION SELECT rid FROM room_state UNION SELECT rid FROM pending_decrypt ORDER BY rid'
        )
        .all() as { rid: string }[];
      return rows.map(({ rid }) => rid);
    },

    search(query) {
      const match = toMatch(query.text);
      const limit = clampLimit(query.limit);
      const unfiltered =
        query.rid === undefined &&
        query.uid === undefined &&
        query.from === undefined &&
        query.to === undefined;

      // An empty text with filters lists the newest messages of
      // the filters. A text with no words, or no filter at all, finds nothing.
      const filtersOnly = query.text.trim() === '' && !unfiltered;
      if (!match && !filtersOnly) return [];

      let rows: MessageRow[];
      if (!match) {
        rows = searchFiltersOnly.all({
          rid: query.rid ?? null,
          uid: query.uid ?? null,
          from: query.from ?? 0,
          to: query.to ?? Number.MAX_SAFE_INTEGER,
          limit,
        }) as MessageRow[];
      } else if (query.order === 'recent' || !unfiltered) {
        const statement =
          query.order === 'recent' ? searchByRecent : searchByRelevance;
        rows = statement.all({
          match,
          rid: query.rid ?? null,
          uid: query.uid ?? null,
          from: query.from ?? 0,
          to: query.to ?? Number.MAX_SAFE_INTEGER,
          limit,
        }) as MessageRow[];
      } else {
        rows = searchUnfilteredByRelevance.all({
          match,
          limit,
        }) as MessageRow[];
      }

      return rows.map(({ id, rid, tmid, uid, username, ts, snippet }) => ({
        id,
        rid,
        ...(tmid !== null && { tmid }),
        uid,
        username,
        ts,
        snippet: toSnippetHtml(snippet),
      }));
    },

    getRoomState(rid) {
      const row = db
        .prepare(
          'SELECT last_update, backfill_cursor, backfill_done FROM room_state WHERE rid = ?'
        )
        .get(rid) as RoomStateRow | undefined;
      if (!row) return undefined;
      return {
        ...(row.last_update !== null && { lastUpdate: row.last_update }),
        ...(row.backfill_cursor !== null && {
          backfillCursor: row.backfill_cursor,
        }),
        backfillDone: row.backfill_done === 1,
      };
    },

    setRoomState(rid, state) {
      inTransaction(() => {
        upsertRoomState.run(
          rid,
          state.lastUpdate ?? null,
          state.backfillCursor ?? null,
          state.backfillDone ? 1 : 0
        );
        checkRoomCaps();
      });
    },

    stats() {
      const { docs } = db
        .prepare('SELECT count(*) AS docs FROM messages')
        .get() as { docs: number };
      const { rooms } = db
        .prepare('SELECT count(DISTINCT rid) AS rooms FROM messages')
        .get() as { rooms: number };
      const { bytes } = db
        .prepare(
          'SELECT page_count * page_size AS bytes FROM pragma_page_count(), pragma_page_size()'
        )
        .get() as { bytes: number };
      return { docs, rooms, bytes };
    },

    wipe() {
      inTransaction(() => createSchema(db, userId));
    },

    // Throws when the FTS index does not match the messages table.
    checkIntegrity() {
      db.prepare(
        "INSERT INTO messages_fts (messages_fts, rank) VALUES ('integrity-check', 1)"
      ).run();
    },
  };
};
