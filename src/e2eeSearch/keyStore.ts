import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { INDEX_DB_FILE_NAME, removeIndexFiles } from './indexFiles';
import { removeStaleTempFiles, SNAPSHOT_FILE_NAME } from './snapshotStore';
import {
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  WRAP_KEY_BYTES,
} from './validate';

export { E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME } from './validate';

export const INDEX_KEY_BYTES = 32;
export const KEY_FILE_NAME = 'key.bin';

// The web client derives a wrap key from the user's E2EE
// private key. With it, `key.bin` holds the index key encrypted by that key,
// inside the keychain wrap. A page without the private key cannot open the
// index, also when its server confirms the user.
export const WRAPPED_PREFIX = 'kw1.';
const WRAP_LABEL = 'Rocket.Chat Desktop E2EE search index key wrap v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

// The index key is wrapped by a wrap key, and the call gave another wrap key
// or none. The key file stays as it is, so the right wrap key opens the index
// later. When the server holds another E2EE public key for the user, the open
// replaces the index before the key file is read (ownerKey.ts).
export class E2EESearchKeyMismatchError extends Error {
  constructor() {
    super('E2EE search index key does not match');
    this.name = E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME;
  }
}

export type SafeStorageApi = Pick<
  Electron.SafeStorage,
  | 'isAsyncEncryptionAvailable'
  | 'encryptStringAsync'
  | 'decryptStringAsync'
  | 'getSelectedStorageBackend'
>;

export type MemoryOnlyReason =
  | 'no-encryption'
  | 'basic-text-backend'
  | 'keychain-timeout'
  // The keychain wrapped the key with Chromium's hard-coded password (Linux
  // `v10`), for example after the user cancelled the keyring prompt.
  | 'hard-coded-wrap';

// A keychain call can wait for the user with no limit, for
// example while GNOME shows the prompt that creates a default keyring. After
// this time the open goes on with a memory-only key, and a late answer of the
// keychain writes and removes nothing.
export const KEYCHAIN_TIMEOUT_MS = 10_000;

export type IndexKey =
  | {
      // The key is wrapped by the OS keychain in `key.bin`. The index can be
      // saved to disk as an encrypted snapshot.
      persistent: true;
      key: Buffer;
      // True when an old `key.bin` could not be unwrapped and a new key
      // replaced it. Snapshots made with the old key cannot be read anymore.
      reset: boolean;
    }
  | {
      // No real keychain. The key exists only in memory, and the index must
      // not be written to disk.
      persistent: false;
      key: Buffer;
      reason: MemoryOnlyReason;
    };

export type LoadOptions = {
  // 32 bytes from the web client. Never the raw E2EE private key.
  wrapKey?: Buffer;
};

export type KeyStore = {
  load(options?: LoadOptions): Promise<IndexKey>;
  // True when `key.bin` holds an index key sealed by a wrap key. Only the
  // keychain is used, never a wrap key.
  isSealed(): Promise<boolean>;
  remove(): Promise<void>;
};

type KeyStoreOptions = {
  dir: string;
  safeStorage: SafeStorageApi;
  platform?: NodeJS.Platform;
  keychainTimeoutMs?: number;
};

// Resolves to `onTimeout()` when `work` does not settle in time. `work` gets
// a function that tells it whether the time ran out, so it can skip its
// writes.
const withTimeLimit = async <T>(
  ms: number,
  work: (timedOut: () => boolean) => Promise<T>,
  onTimeout: () => T
): Promise<T> => {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(() => timedOut),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true;
          resolve(onTimeout());
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const writeAtomically = async (file: string, data: Buffer) => {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, data, { mode: 0o600 });
  await rename(temp, file);
};

// A view of the HKDF output, not a copy, so a fill(0) zeroes the derived
// key itself.
const keyEncryptionKey = (wrapKey: Buffer): Buffer =>
  Buffer.from(hkdfSync('sha256', wrapKey, Buffer.alloc(0), WRAP_LABEL, 32));

// The cipher keeps its own copy of the key encryption key, so
// the code zeroes the derived key as soon as the cipher exists.
const sealIndexKey = (key: Buffer, wrapKey: Buffer): string => {
  const iv = randomBytes(IV_BYTES);
  const kek = keyEncryptionKey(wrapKey);
  let cipher;
  try {
    cipher = createCipheriv('aes-256-gcm', kek, iv);
  } finally {
    kek.fill(0);
  }
  cipher.setAAD(Buffer.from(WRAP_LABEL));
  const sealed = Buffer.concat([cipher.update(key), cipher.final()]);
  return (
    WRAPPED_PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64')
  );
};

// Undefined when the wrap key is not the one that sealed the index key.
// Exported for the dev snapshot scan tool, which must not write key.bin.
export const openIndexKey = (
  sealed: string,
  wrapKey: Buffer
): Buffer | undefined => {
  const bytes = Buffer.from(sealed.slice(WRAPPED_PREFIX.length), 'base64');
  if (bytes.length !== IV_BYTES + TAG_BYTES + INDEX_KEY_BYTES) return undefined;
  const kek = keyEncryptionKey(wrapKey);
  // The index key, decrypted before the tag check. Zeroed after the copy
  // into the result.
  let plain: Buffer | undefined;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      kek,
      bytes.subarray(0, IV_BYTES)
    );
    decipher.setAAD(Buffer.from(WRAP_LABEL));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    plain = decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES));
    return Buffer.concat([plain, decipher.final()]);
  } catch {
    return undefined;
  } finally {
    kek.fill(0);
    plain?.fill(0);
  }
};

const readIfExists = async (file: string) => {
  try {
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

export const createKeyStore = ({
  dir,
  safeStorage,
  platform = process.platform,
  keychainTimeoutMs = KEYCHAIN_TIMEOUT_MS,
}: KeyStoreOptions): KeyStore => {
  const keyFile = path.join(dir, KEY_FILE_NAME);

  const memoryOnlyReason = async (): Promise<MemoryOnlyReason | undefined> => {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      return 'no-encryption';
    }
    // On Linux without a secret service, Chromium encrypts with a hard-coded
    // password. That is not encryption at rest, so the key must not persist.
    if (
      platform === 'linux' &&
      ['basic_text', 'unknown'].includes(
        safeStorage.getSelectedStorageBackend()
      )
    ) {
      return 'basic-text-backend';
    }
    return undefined;
  };

  // On Linux, Chromium marks a wrap made with its hard-coded password with
  // `v10` (a keyring wrap is `v11`). It does that also when the backend reads
  // gnome_libsecret, for example after the user cancels the GNOME prompt that
  // creates a default keyring. Anyone can unwrap such a file.
  const isHardCodedWrap = (wrapped: Buffer) =>
    platform === 'linux' && wrapped.subarray(0, 3).toString() === 'v10';

  // The index files were sealed with the key that the hard-coded wrap holds,
  // so they leave with the key file. A save that a kill stopped leaves a temp
  // file with the same key, and it goes too.
  const discardHardCodedWrap = async () => {
    await rm(keyFile, { force: true });
    await removeIndexFiles(path.join(dir, INDEX_DB_FILE_NAME));
    await rm(path.join(dir, SNAPSHOT_FILE_NAME), { force: true });
    await removeStaleTempFiles(dir);
  };

  // `hard-coded-wrap` when the wrap is not real encryption, and `timeout` when
  // the keychain answered after the time limit: nothing is written then.
  const wrapAndWrite = async (
    key: Buffer,
    wrapKey: Buffer | undefined,
    timedOut: () => boolean
  ) => {
    const wrapped = await safeStorage.encryptStringAsync(
      wrapKey ? sealIndexKey(key, wrapKey) : key.toString('base64')
    );
    if (isHardCodedWrap(wrapped)) return 'hard-coded-wrap';
    if (timedOut()) return 'timeout';
    await mkdir(dir, { recursive: true });
    await writeAtomically(keyFile, wrapped);
    return 'written';
  };

  // Undefined when the keychain cannot unwrap the file: the file is lost,
  // and a new key replaces it. Throws when only the wrap key is wrong.
  // `hard-coded-wrap` when a re-wrap failed: the file keeps its old wrap for
  // the next load, and this load must not save with the old key.
  const unwrap = async (
    wrapped: Buffer,
    wrapKey: Buffer | undefined,
    timedOut: () => boolean
  ) => {
    let plain: string;
    let shouldReEncrypt: boolean;
    try {
      ({ result: plain, shouldReEncrypt } =
        await safeStorage.decryptStringAsync(wrapped));
    } catch {
      return undefined;
    }
    let key: Buffer | undefined;
    if (plain.startsWith(WRAPPED_PREFIX)) {
      key = wrapKey && openIndexKey(plain, wrapKey);
      if (!key) throw new E2EESearchKeyMismatchError();
    } else {
      key = Buffer.from(plain, 'base64');
      if (key.length !== INDEX_KEY_BYTES) return undefined;
      // An old key file: wrap it with the wrap key from now on.
      if (wrapKey) shouldReEncrypt = true;
    }
    if (
      shouldReEncrypt &&
      (await wrapAndWrite(key, wrapKey, timedOut)) === 'hard-coded-wrap'
    ) {
      key.fill(0);
      return 'hard-coded-wrap';
    }
    return key;
  };

  const loadWithKeychain = async (
    wrapKey: Buffer | undefined,
    timedOut: () => boolean
  ): Promise<IndexKey> => {
    const reason = await memoryOnlyReason();
    if (reason) {
      // The index files stay on disk for a later persistent load.
      // A key file that anyone can unwrap must not stay with
      // them. Only Linux has such a wrap.
      const wrapped =
        platform === 'linux' ? await readIfExists(keyFile) : undefined;
      if (wrapped && isHardCodedWrap(wrapped) && !timedOut()) {
        await discardHardCodedWrap();
      }
      return {
        persistent: false,
        key: randomBytes(INDEX_KEY_BYTES),
        reason,
      };
    }

    const wrapped = await readIfExists(keyFile);
    const existing =
      wrapped &&
      !isHardCodedWrap(wrapped) &&
      (await unwrap(wrapped, wrapKey, timedOut));
    if (existing === 'hard-coded-wrap') {
      return {
        persistent: false,
        key: randomBytes(INDEX_KEY_BYTES),
        reason: 'hard-coded-wrap',
      };
    }
    if (existing) {
      return { persistent: true, key: existing, reset: false };
    }

    const key = randomBytes(INDEX_KEY_BYTES);
    const written = await wrapAndWrite(key, wrapKey, timedOut);
    if (written !== 'written') {
      if (wrapped && isHardCodedWrap(wrapped) && !timedOut()) {
        await discardHardCodedWrap();
      }
      return {
        persistent: false,
        key,
        reason:
          written === 'hard-coded-wrap'
            ? 'hard-coded-wrap'
            : 'basic-text-backend',
      };
    }
    return { persistent: true, key, reset: wrapped !== undefined };
  };

  return {
    async load({ wrapKey } = {}) {
      if (wrapKey && wrapKey.length !== WRAP_KEY_BYTES) {
        throw new Error('wrap key must be 32 bytes');
      }
      // A new random key, never the one that the late keychain call holds.
      return withTimeLimit(
        keychainTimeoutMs,
        (timedOut) => loadWithKeychain(wrapKey, timedOut),
        () => ({
          persistent: false,
          key: randomBytes(INDEX_KEY_BYTES),
          reason: 'keychain-timeout',
        })
      );
    },

    // False when the keychain does not answer in time: a logout then deletes
    // the index, as for a key file that is lost.
    async isSealed() {
      const wrapped = await readIfExists(keyFile);
      if (!wrapped) return false;
      return withTimeLimit(
        keychainTimeoutMs,
        async () => {
          try {
            const { result } = await safeStorage.decryptStringAsync(wrapped);
            return result.startsWith(WRAPPED_PREFIX);
          } catch {
            return false;
          }
        },
        () => false
      );
    },

    async remove() {
      await rm(keyFile, { force: true });
    },
  };
};
