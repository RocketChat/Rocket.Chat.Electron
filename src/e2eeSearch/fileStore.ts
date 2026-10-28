import { rm } from 'node:fs/promises';
import type { DatabaseSync } from 'node:sqlite';

import Database from 'better-sqlite3-multiple-ciphers';

// The page-encrypted index file (design D5, option 1). SQLite3MultipleCiphers
// encrypts each page before it reaches the disk: the database file, its WAL
// and its journal hold only ciphertext. A save writes only the changed pages,
// not a snapshot of the whole database.
export const INDEX_DB_FILE_NAME = 'index.db';

// ChaCha20-Poly1305: an AEAD with a 256-bit key, the sqlite3mc default.
const CIPHER = 'chacha20';

const INDEX_FILE_SUFFIXES = ['', '-wal', '-shm', '-journal'];

export class IndexFileRejectedError extends Error {
  constructor(reason: string) {
    super(`E2EE search index file rejected: ${reason}`);
    this.name = 'IndexFileRejectedError';
  }
}

// A wrong key and a damaged file both read as "not a database".
const REJECTED_CODES = new Set(['SQLITE_NOTADB', 'SQLITE_CORRUPT']);

export const removeIndexFiles = async (file: string): Promise<void> => {
  await Promise.all(
    INDEX_FILE_SUFFIXES.map((suffix) => rm(`${file}${suffix}`, { force: true }))
  );
};

// Opens (or creates) the encrypted index file. The returned connection has
// the subset of the node:sqlite API that the engine uses (`exec`, `prepare`
// with `get`, `all` and `run`, `close`).
export const openEncryptedIndexFile = (
  file: string,
  key: Buffer
): DatabaseSync => {
  if (key.length !== 32)
    throw new Error('E2EE search index key must be 32 bytes');
  const db = new Database(file);
  try {
    db.pragma(`cipher='${CIPHER}'`);
    db.pragma(`hexkey='${key.toString('hex')}'`);
    try {
      // The first read checks the key against the file.
      db.prepare('SELECT count(*) FROM sqlite_master').get();
    } catch (error) {
      const { code } = error as { code?: string };
      if (code && REJECTED_CODES.has(code)) {
        throw new IndexFileRejectedError(code);
      }
      throw error;
    }
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    // A save is an explicit checkpoint, so the WAL does not grow between
    // saves past what the host writes.
    db.pragma('wal_autocheckpoint = 0');
    // Sort runs and temp tables stay in memory: SQLite does not encrypt
    // temp files.
    db.pragma('temp_store = MEMORY');
    // Overwrite freed pages, so a removed or wiped message leaves no
    // decryptable copy in a free page of the file.
    db.pragma('secure_delete = ON');
  } catch (error) {
    db.close();
    throw error;
  }
  return db as unknown as DatabaseSync;
};

export const checkpointIndexFile = (db: DatabaseSync): void => {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
};
