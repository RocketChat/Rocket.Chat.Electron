import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { IndexKey } from './keyStore';

// Format:
// magic "RCES" | version (1 byte) | iv (12 bytes) | ciphertext | tag (16 bytes)
// The magic and the version are also the GCM additional data, so a changed
// header fails the tag check.
export const SNAPSHOT_FILE_NAME = 'index.bin';
export const SNAPSHOT_MAGIC = Buffer.from('RCES', 'ascii');
export const SNAPSHOT_VERSION = 1;

const HEADER_BYTES = SNAPSHOT_MAGIC.length + 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const CIPHER = 'aes-256-gcm';

export class SnapshotRejectedError extends Error {
  constructor(reason: string) {
    super(`E2EE search snapshot rejected: ${reason}`);
    this.name = 'SnapshotRejectedError';
  }
}

const header = () =>
  Buffer.concat([SNAPSHOT_MAGIC, Buffer.from([SNAPSHOT_VERSION])]);

export const encryptSnapshot = (plain: Uint8Array, key: Buffer): Buffer => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key, iv);
  const head = header();
  cipher.setAAD(head);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([head, iv, body, cipher.getAuthTag()]);
};

export const decryptSnapshot = (file: Buffer, key: Buffer): Buffer => {
  if (file.length < HEADER_BYTES + IV_BYTES + TAG_BYTES) {
    throw new SnapshotRejectedError('file too short');
  }
  const head = file.subarray(0, HEADER_BYTES);
  if (!head.subarray(0, SNAPSHOT_MAGIC.length).equals(SNAPSHOT_MAGIC)) {
    throw new SnapshotRejectedError('bad magic');
  }
  if (head[SNAPSHOT_MAGIC.length] !== SNAPSHOT_VERSION) {
    throw new SnapshotRejectedError('unknown version');
  }
  const iv = file.subarray(HEADER_BYTES, HEADER_BYTES + IV_BYTES);
  const body = file.subarray(HEADER_BYTES + IV_BYTES, file.length - TAG_BYTES);
  const tag = file.subarray(file.length - TAG_BYTES);
  try {
    const decipher = createDecipheriv(CIPHER, key, iv);
    decipher.setAAD(head);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    throw new SnapshotRejectedError('authentication failed');
  }
};

// `serialize` and `deserialize` exist on node:sqlite in Electron 42+, but
// @types/node does not declare them yet.
type SerializableDatabase = DatabaseSync & {
  serialize(): Uint8Array;
  deserialize(data: Uint8Array): void;
};

export const serializeDatabase = (db: DatabaseSync): Uint8Array =>
  (db as SerializableDatabase).serialize();

export const deserializeDatabase = (db: DatabaseSync, data: Uint8Array) =>
  (db as SerializableDatabase).deserialize(data);

// Temp files of saves that run now. A sweep never removes them.
const liveTemps = new Set<string>();

// A save that a kill stopped leaves `index.bin.<pid>.<time>.tmp` behind. The
// next open or wipe removes each such file, except the temp file of a save
// that runs now.
export const removeStaleTempFiles = async (dir: string): Promise<void> => {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    names
      .filter(
        (name) =>
          name.endsWith('.tmp') &&
          (name.startsWith(`${SNAPSHOT_FILE_NAME}.`) ||
            name.startsWith('index.db')) &&
          !liveTemps.has(path.join(dir, name))
      )
      .map((name) => rm(path.join(dir, name), { force: true }))
  );
};

export type SnapshotStore = {
  // The decrypted database bytes, or undefined when there is no usable
  // snapshot. A rejected file is deleted, because the index is a cache.
  load(): Promise<Uint8Array | undefined>;
  save(plain: Uint8Array): Promise<void>;
  remove(): Promise<void>;
};

type SnapshotStoreOptions = {
  dir: string;
  indexKey: IndexKey;
  onRejected?: (error: SnapshotRejectedError) => void;
};

export const createSnapshotStore = ({
  dir,
  indexKey,
  onRejected,
}: SnapshotStoreOptions): SnapshotStore => {
  const file = path.join(dir, SNAPSHOT_FILE_NAME);
  // A new key cannot read a snapshot made with the old key. Discard it once.
  let discardOld = indexKey.persistent && indexKey.reset;

  const remove = async () => {
    await rm(file, { force: true });
    await removeStaleTempFiles(dir);
  };

  return {
    async load() {
      // A memory-only key cannot read the snapshot of a persistent key, and
      // it never writes one. The snapshot stays for the next persistent open.
      // The key store removes a key file that anyone can
      // unwrap, so the file stays encrypted.
      if (!indexKey.persistent) return undefined;
      await removeStaleTempFiles(dir);
      if (discardOld) {
        discardOld = false;
        await remove();
        return undefined;
      }

      let data: Buffer;
      try {
        data = await readFile(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return undefined;
        }
        throw error;
      }

      try {
        return decryptSnapshot(data, indexKey.key);
      } catch (error) {
        if (!(error instanceof SnapshotRejectedError)) throw error;
        onRejected?.(error);
        await remove();
        return undefined;
      }
    },

    async save(plain) {
      if (!indexKey.persistent) return;
      discardOld = false;
      await mkdir(dir, { recursive: true });
      // Write a temporary file, then rename it. A crash leaves the last good
      // snapshot in place.
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
      liveTemps.add(temp);
      try {
        await writeFile(temp, encryptSnapshot(plain, indexKey.key), {
          mode: 0o600,
        });
        await rename(temp, file);
      } catch (error) {
        await rm(temp, { force: true });
        throw error;
      } finally {
        liveTemps.delete(temp);
      }
    },

    remove,
  };
};
