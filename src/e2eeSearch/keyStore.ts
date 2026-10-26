import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
const WRAPPED_PREFIX = 'kw1.';
const WRAP_LABEL = 'Rocket.Chat Desktop E2EE search index key wrap v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

// The index key is wrapped by a wrap key, and the call gave another wrap key
// or none. The key file stays as it is, so the right wrap key opens the index
// later. A user whose E2EE key changed clears the index in Settings.
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

export type MemoryOnlyReason = 'no-encryption' | 'basic-text-backend';

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
};

const writeAtomically = async (file: string, data: Buffer) => {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, data, { mode: 0o600 });
  await rename(temp, file);
};

const keyEncryptionKey = (wrapKey: Buffer): Buffer =>
  Buffer.from(hkdfSync('sha256', wrapKey, Buffer.alloc(0), WRAP_LABEL, 32));

const sealIndexKey = (key: Buffer, wrapKey: Buffer): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyEncryptionKey(wrapKey), iv);
  cipher.setAAD(Buffer.from(WRAP_LABEL));
  const sealed = Buffer.concat([cipher.update(key), cipher.final()]);
  return (
    WRAPPED_PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64')
  );
};

// Undefined when the wrap key is not the one that sealed the index key.
const openIndexKey = (sealed: string, wrapKey: Buffer): Buffer | undefined => {
  const bytes = Buffer.from(sealed.slice(WRAPPED_PREFIX.length), 'base64');
  if (bytes.length !== IV_BYTES + TAG_BYTES + INDEX_KEY_BYTES) return undefined;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyEncryptionKey(wrapKey),
      bytes.subarray(0, IV_BYTES)
    );
    decipher.setAAD(Buffer.from(WRAP_LABEL));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
  } catch {
    return undefined;
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

  const wrapAndWrite = async (key: Buffer, wrapKey?: Buffer) => {
    const wrapped = await safeStorage.encryptStringAsync(
      wrapKey ? sealIndexKey(key, wrapKey) : key.toString('base64')
    );
    await mkdir(dir, { recursive: true });
    await writeAtomically(keyFile, wrapped);
  };

  // Undefined when the keychain cannot unwrap the file: the file is lost,
  // and a new key replaces it. Throws when only the wrap key is wrong.
  const unwrap = async (wrapped: Buffer, wrapKey?: Buffer) => {
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
    if (shouldReEncrypt) await wrapAndWrite(key, wrapKey);
    return key;
  };

  return {
    async load({ wrapKey } = {}) {
      if (wrapKey && wrapKey.length !== WRAP_KEY_BYTES) {
        throw new Error('wrap key must be 32 bytes');
      }
      const reason = await memoryOnlyReason();
      if (reason) {
        return {
          persistent: false,
          key: randomBytes(INDEX_KEY_BYTES),
          reason,
        };
      }

      const wrapped = await readIfExists(keyFile);
      const existing = wrapped && (await unwrap(wrapped, wrapKey));
      if (existing) {
        return { persistent: true, key: existing, reset: false };
      }

      const key = randomBytes(INDEX_KEY_BYTES);
      await wrapAndWrite(key, wrapKey);
      return { persistent: true, key, reset: wrapped !== undefined };
    },

    async isSealed() {
      const wrapped = await readIfExists(keyFile);
      if (!wrapped) return false;
      try {
        const { result } = await safeStorage.decryptStringAsync(wrapped);
        return result.startsWith(WRAPPED_PREFIX);
      } catch {
        return false;
      }
    },

    async remove() {
      await rm(keyFile, { force: true });
    },
  };
};
