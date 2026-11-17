import { MAX_QUERY_TOKENS, queryWords } from './sanitize';
import type {
  E2EESearchDoc,
  E2EESearchQuery,
  E2EESearchRecentCursor,
  E2EESearchRecentQuery,
  E2EESearchRoomState,
} from './types';

// Size limits for data that a server webview sends to the main process.
export const MAX_BATCH_SIZE = 500;
export const MAX_ID_LENGTH = 128;
export const MAX_USERNAME_LENGTH = 256;
export const MAX_BODY_LENGTH = 64 * 1024;
export const MAX_QUERY_TEXT_LENGTH = 1024;
export const MAX_CURSOR_LENGTH = 1024;
// The most hits that one search returns. The engine applies it too, so a page
// gets no more hits from a larger limit.
export const MAX_SEARCH_LIMIT = 100;
// The sum of the body lengths in one upsert call.
export const MAX_BATCH_BODY_LENGTH = 2 * 1024 * 1024;

export class E2EESearchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'E2EESearchInputError';
  }
}

// A call that is valid, but that would take an index or the index folder
// past a total cap. The page cannot fix it by sending other data.
export class E2EESearchQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'E2EESearchQuotaError';
  }
}

const fail = (message: string): never => {
  throw new E2EESearchInputError(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const string = (value: unknown, name: string, max: number): string => {
  if (typeof value !== 'string') return fail(`${name} must be a string`);
  if (value.length > max) return fail(`${name} is longer than ${max}`);
  return value;
};

const id = (value: unknown, name: string): string => {
  const text = string(value, name, MAX_ID_LENGTH);
  if (text.length === 0) return fail(`${name} is empty`);
  return text;
};

const optional = <T>(
  value: unknown,
  check: (value: unknown) => T
): T | undefined => (value === undefined ? undefined : check(value));

const time = (value: unknown, name: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(`${name} must be a finite number`);
  }
  return value;
};

const batch = (value: unknown, name: string): unknown[] => {
  if (!Array.isArray(value)) return fail(`${name} must be an array`);
  if (value.length > MAX_BATCH_SIZE) {
    return fail(`${name} has more than ${MAX_BATCH_SIZE} items`);
  }
  return value;
};

const KINDS = new Set(['text', 'file', 'attachment']);

const doc = (value: unknown): E2EESearchDoc => {
  if (!isRecord(value)) return fail('doc must be an object');
  if (typeof value.kind !== 'string' || !KINDS.has(value.kind)) {
    return fail('doc.kind is not valid');
  }
  return {
    id: id(value.id, 'doc.id'),
    rid: id(value.rid, 'doc.rid'),
    tmid: optional(value.tmid, (tmid) => id(tmid, 'doc.tmid')),
    uid: id(value.uid, 'doc.uid'),
    username: string(value.username, 'doc.username', MAX_USERNAME_LENGTH),
    ts: time(value.ts, 'doc.ts'),
    updatedAt: time(value.updatedAt, 'doc.updatedAt'),
    kind: value.kind as E2EESearchDoc['kind'],
    body: string(value.body, 'doc.body', MAX_BODY_LENGTH),
  };
};

// The key that the web client derives from the user's E2EE private
// key. Only a Uint8Array of exactly 32 bytes passes, so the raw private key
// (a JWK object or a longer key) cannot reach the main process by mistake.
export const WRAP_KEY_BYTES = 32;

// The name of the error when a wrap key does not open the index. It is here,
// not in keyStore.ts, because the preload bundle imports ipc.ts.
export const E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME = 'E2EESearchKeyMismatchError';

export const validateScope = (
  value: unknown
): { userId: string; wrapKey?: Buffer } => {
  if (!isRecord(value)) return fail('scope must be an object');
  const userId = id(value.userId, 'scope.userId');
  // The user id is a folder name. Allow only the characters of a Meteor id.
  if (!/^[A-Za-z0-9_-]+$/.test(userId))
    return fail('scope.userId is not valid');
  const wrapKey = optional(value.wrapKey, (key) => {
    if (!(key instanceof Uint8Array) || key.length !== WRAP_KEY_BYTES) {
      return fail(
        `scope.wrapKey must be a Uint8Array of ${WRAP_KEY_BYTES} bytes`
      );
    }
    // A copy: the page cannot change the bytes after the check.
    return Buffer.from(key);
  });
  return wrapKey ? { userId, wrapKey } : { userId };
};

export const validateDocs = (value: unknown): E2EESearchDoc[] => {
  const docs = batch(value, 'docs').map(doc);
  const total = docs.reduce((sum, item) => sum + item.body.length, 0);
  if (total > MAX_BATCH_BODY_LENGTH) {
    return fail(`docs have more than ${MAX_BATCH_BODY_LENGTH} body characters`);
  }
  return docs;
};

export const validateIds = (value: unknown): string[] =>
  batch(value, 'ids').map((item) => id(item, 'id'));

export const validateRid = (value: unknown): string => id(value, 'rid');

export const validateQuery = (value: unknown): E2EESearchQuery => {
  if (!isRecord(value)) return fail('query must be an object');
  const order = optional(value.order, (order) =>
    order === 'relevance' || order === 'recent'
      ? order
      : fail('query.order is not valid')
  );
  const text = string(value.text, 'query.text', MAX_QUERY_TEXT_LENGTH);
  if (queryWords(text).length > MAX_QUERY_TOKENS) {
    fail(`query.text has more than ${MAX_QUERY_TOKENS} words`);
  }
  return {
    text,
    rid: optional(value.rid, (rid) => id(rid, 'query.rid')),
    uid: optional(value.uid, (uid) => id(uid, 'query.uid')),
    from: optional(value.from, (from) => time(from, 'query.from')),
    to: optional(value.to, (to) => time(to, 'query.to')),
    order,
    limit: optional(value.limit, (limit) =>
      Math.min(time(limit, 'query.limit'), MAX_SEARCH_LIMIT)
    ),
  };
};

export const validateRecentQuery = (value: unknown): E2EESearchRecentQuery => {
  if (!isRecord(value)) return fail('query must be an object');
  if (value.order !== undefined) return fail('query.order is not valid');
  const { order: _order, ...query } = validateQuery(value);
  const cursor = optional(value.cursor, (cursor): E2EESearchRecentCursor => {
    if (!isRecord(cursor)) return fail('query.cursor must be an object');
    return {
      ts: time(cursor.ts, 'query.cursor.ts'),
      id: id(cursor.id, 'query.cursor.id'),
    };
  });
  return { ...query, ...(cursor !== undefined && { cursor }) };
};

export const validateRoomState = (value: unknown): E2EESearchRoomState => {
  if (!isRecord(value)) return fail('state must be an object');
  if (typeof value.backfillDone !== 'boolean') {
    return fail('state.backfillDone must be a boolean');
  }
  return {
    lastUpdate: optional(value.lastUpdate, (lastUpdate) =>
      time(lastUpdate, 'state.lastUpdate')
    ),
    backfillCursor: optional(value.backfillCursor, (cursor) =>
      string(cursor, 'state.backfillCursor', MAX_CURSOR_LENGTH)
    ),
    backfillDone: value.backfillDone,
  };
};
