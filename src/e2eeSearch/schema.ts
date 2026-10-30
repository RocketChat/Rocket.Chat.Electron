// The same SQL must run in
// node:sqlite (desktop) and SQLite WASM (browser). Bump SCHEMA_VERSION on
// every change: the index is a cache, so an old version is dropped and rebuilt.
export const SCHEMA_VERSION = 2;

// The rowid of a message follows its ts: rowid = tsKey * 2^ROWID_TS_SHIFT +
// n, where tsKey is the ts in whole ms and n counts the messages with that
// ms. So FTS5 returns the matches in ts order (ORDER BY rowid DESC) and a
// newest-first search stops after LIMIT rows. Without it, a common word
// read, joined and sorted every match (200,000 messages: 100,000 matches,
// 107 ms). The index holds at most MAX_INDEX_DOCS (500,000) < 2^20 messages,
// so one ms never fills its range. TS_KEY_MAX keeps the rowid in 63 bits.
export const ROWID_TS_SHIFT = 20;
export const TS_KEY_MAX = 2 ** 42;

export const SCHEMA_SQL = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE messages (
  rowid INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  rid TEXT NOT NULL,
  tmid TEXT,
  uid TEXT NOT NULL,
  username TEXT NOT NULL,
  ts INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE INDEX messages_rid_ts ON messages (rid, ts);
CREATE INDEX messages_uid_ts ON messages (uid, ts);

CREATE VIRTUAL TABLE messages_fts USING fts5(
  body,
  content = 'messages',
  content_rowid = 'rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);
INSERT INTO messages_fts (messages_fts, rank) VALUES ('secure-delete', 1);

CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts (rowid, body) VALUES (new.rowid, new.body);
END;
CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
END;
CREATE TRIGGER messages_au AFTER UPDATE OF body ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
  INSERT INTO messages_fts (rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TABLE room_state (
  rid TEXT PRIMARY KEY,
  last_update INTEGER,
  backfill_cursor TEXT,
  backfill_done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pending_decrypt (
  id TEXT PRIMARY KEY,
  rid TEXT NOT NULL,
  kid TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const DROP_SQL = `
DROP TABLE IF EXISTS messages_fts;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS room_state;
DROP TABLE IF EXISTS pending_decrypt;
DROP TABLE IF EXISTS meta;
`;

const SEARCH_SELECT = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts,
       snippet(messages_fts, 0, char(57344), char(57345), '…', 12) AS snippet
FROM messages_fts
JOIN messages m ON m.rowid = messages_fts.rowid
WHERE messages_fts MATCH :match
  AND (:rid IS NULL OR m.rid = :rid)
  AND (:uid IS NULL OR m.uid = :uid)
  AND m.ts BETWEEN :from AND :to
`;

export const SEARCH_BY_RELEVANCE_SQL = `${SEARCH_SELECT}
ORDER BY bm25(messages_fts)
LIMIT :limit`;

const RECENT_PAGE_CONTINUATION = `
  AND (:cursorTs IS NULL OR m.ts < :cursorTs
       OR (m.ts = :cursorTs AND m.id COLLATE BINARY < :cursorId))
`;

export const SEARCH_RECENT_PAGE_SQL = `${SEARCH_SELECT}
${RECENT_PAGE_CONTINUATION}
ORDER BY m.ts DESC, m.id COLLATE BINARY DESC
LIMIT :limit`;

// The rowid follows ts (see ROWID_TS_SHIFT), so FTS5 reads the matches
// newest first and the query stops after :limit rows that pass the filters.
// It makes a snippet only for those rows. The rowid range is the date
// filter in rowid form: FTS5 skips the matches outside it.
export const SEARCH_BY_RECENT_SQL = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts,
       snippet(messages_fts, 0, char(57344), char(57345), '…', 12) AS snippet
FROM messages_fts
JOIN messages m ON m.rowid = messages_fts.rowid
WHERE messages_fts MATCH :match
  AND messages_fts.rowid BETWEEN CAST(:fromKey AS INTEGER) * ${2 ** ROWID_TS_SHIFT}
                             AND CAST(:toKey AS INTEGER) * ${2 ** ROWID_TS_SHIFT} + ${2 ** ROWID_TS_SHIFT - 1}
  AND (:rid IS NULL OR m.rid = :rid)
  AND (:uid IS NULL OR m.uid = :uid)
  AND m.ts BETWEEN :from AND :to
ORDER BY messages_fts.rowid DESC
LIMIT :limit`;

// A relevance query with no room, sender or date filter ranks the matches in
// the FTS table alone, and joins only the rows of the result. A common word
// matches a large part of the index, and the join of each match cost about a
// quarter of the query time (200,000 messages, a word in half of them).
export const SEARCH_UNFILTERED_BY_RELEVANCE_SQL = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts, f.snippet
FROM (
  SELECT rowid,
         snippet(messages_fts, 0, char(57344), char(57345), '…', 12) AS snippet,
         bm25(messages_fts) AS score
  FROM messages_fts
  WHERE messages_fts MATCH :match
  ORDER BY score
  LIMIT :limit
) f
JOIN messages m ON m.rowid = f.rowid
ORDER BY f.score`;

// A query with filters and no words has no MATCH: it returns the
// newest messages of the filters. Without a match, the snippet is the start
// of the body, about as long as the 12 tokens of snippet() and with no marks.
// The subquery picks the rows first, so only those rows get a snippet.
export const FILTER_ONLY_SNIPPET_LENGTH = 80;

export const SEARCH_FILTERS_ONLY_SQL = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts,
       CASE WHEN length(m.body) > ${FILTER_ONLY_SNIPPET_LENGTH}
            THEN substr(m.body, 1, ${FILTER_ONLY_SNIPPET_LENGTH}) || '…'
            ELSE m.body
       END AS snippet
FROM messages m
WHERE m.rowid IN (
  SELECT rowid
  FROM messages
  WHERE (:rid IS NULL OR rid = :rid)
    AND (:uid IS NULL OR uid = :uid)
    AND ts BETWEEN :from AND :to
  ORDER BY ts DESC
  LIMIT :limit
)
ORDER BY m.ts DESC`;

export const SEARCH_RECENT_PAGE_FILTERS_ONLY_SQL = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts,
       CASE WHEN length(m.body) > ${FILTER_ONLY_SNIPPET_LENGTH}
            THEN substr(m.body, 1, ${FILTER_ONLY_SNIPPET_LENGTH}) || '…'
            ELSE m.body
       END AS snippet
FROM messages m
WHERE (:rid IS NULL OR m.rid = :rid)
  AND (:uid IS NULL OR m.uid = :uid)
  AND m.ts BETWEEN :from AND :to
${RECENT_PAGE_CONTINUATION}
ORDER BY m.ts DESC, m.id COLLATE BINARY DESC
LIMIT :limit`;
