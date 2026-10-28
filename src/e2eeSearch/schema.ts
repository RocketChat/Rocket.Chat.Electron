// The same SQL must run in
// node:sqlite (desktop) and SQLite WASM (browser). Bump SCHEMA_VERSION on
// every change: the index is a cache, so an old version is dropped and rebuilt.
export const SCHEMA_VERSION = 1;

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

// The subquery picks the newest matches without snippet(). The outer query
// scans the matches once and makes a snippet only for those rows. A common
// word matches a large part of the index, and a snippet for each match cost
// most of the query time (200,000 messages, a word in half of them). The `+`
// keeps the rowid filter out of FTS5: each FTS5 lookup by rowid loads the
// full match list of the term again, which is slower than one scan.
export const SEARCH_BY_RECENT_SQL = `
SELECT m.id, m.rid, m.tmid, m.uid, m.username, m.ts,
       snippet(messages_fts, 0, char(57344), char(57345), '…', 12) AS snippet
FROM messages_fts
JOIN messages m ON m.rowid = messages_fts.rowid
WHERE messages_fts MATCH :match
  AND +messages_fts.rowid IN (
    SELECT m.rowid
    FROM messages_fts
    JOIN messages m ON m.rowid = messages_fts.rowid
    WHERE messages_fts MATCH :match
      AND (:rid IS NULL OR m.rid = :rid)
      AND (:uid IS NULL OR m.uid = :uid)
      AND m.ts BETWEEN :from AND :to
    ORDER BY m.ts DESC
    LIMIT :limit
  )
ORDER BY m.ts DESC`;

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
