import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { SafeStorageApi } from './keyStore';

// The dev test key replaces the OS keychain in a dev build only. The dev
// Electron binary has no keychain grant on macOS, and "Always Allow" would
// give it the key of the installed app. With this key, `yarn start` still
// writes the encrypted snapshot, so a dev run can prove find-after-restart
// with no dialog. The key is random for each dev profile. It is not a
// constant in the code.
export const DEV_TEST_KEY_FILE_NAME = 'e2ee-search-dev-test.key';

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAGIC = Buffer.from('rcdk1');

export type KeySource = 'os-keychain' | 'memory-only' | 'dev-test-key';

// Only an unpackaged development build reads the flags. `nodeEnv` comes from
// the build, and rollup sets it to 'development' when the build environment
// has no NODE_ENV. So a packaged app also ignores the flags.
export const selectKeySource = (
  nodeEnv: string | undefined,
  env: Record<string, string | undefined>,
  isPackaged: boolean
): KeySource => {
  if (isPackaged || nodeEnv !== 'development') return 'os-keychain';
  if (env.ROCKETCHAT_E2EE_SEARCH_MEMORY_ONLY === 'true') return 'memory-only';
  if (env.ROCKETCHAT_E2EE_SEARCH_DEV_TEST_KEY === 'true') {
    return 'dev-test-key';
  }
  return 'os-keychain';
};

const readOrCreateKey = async (file: string): Promise<Buffer> => {
  try {
    const key = await readFile(file);
    if (key.length === KEY_BYTES) return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const key = randomBytes(KEY_BYTES);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, key, { mode: 0o600 });
  await rename(temp, file);
  return key;
};

// A safeStorage stand-in that wraps strings with AES-256-GCM under the key in
// `file`. On Linux the key store treats the `unknown` backend as memory-only,
// so this stand-in gives persistence on macOS and Windows only. A Linux dev
// build can use the real secret service, which shows no dialog.
export const createDevTestKeySafeStorage = (file: string): SafeStorageApi => {
  let key: Promise<Buffer> | undefined;
  const getKey = () => {
    key ??= readOrCreateKey(file);
    return key;
  };

  return {
    isAsyncEncryptionAvailable: async () => true,
    getSelectedStorageBackend: () => 'unknown',

    async encryptStringAsync(plainText: string) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', await getKey(), iv);
      const body = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final(),
      ]);
      return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
    },

    async decryptStringAsync(encrypted: Buffer) {
      if (!isDevTestKeyWrapped(encrypted)) {
        throw new Error('Error while decrypting');
      }
      const result = openDevTestKeyWrap(encrypted, await getKey());
      return { result, shouldReEncrypt: false };
    },
  };
};

// True when `encrypted` has the header of the dev test key wrap. The OS
// keychain never writes this header.
export const isDevTestKeyWrapped = (encrypted: Buffer): boolean => {
  const head = encrypted.subarray(0, MAGIC.length);
  return head.length === MAGIC.length && timingSafeEqual(head, MAGIC);
};

// Opens a dev test key wrap with the given key. It reads and writes no file,
// so the snapshot scan tool can use it on a dev profile.
export const openDevTestKeyWrap = (encrypted: Buffer, key: Buffer): string => {
  if (!isDevTestKeyWrapped(encrypted)) {
    throw new Error('Error while decrypting');
  }
  let offset = MAGIC.length;
  const iv = encrypted.subarray(offset, (offset += IV_BYTES));
  const tag = encrypted.subarray(offset, (offset += TAG_BYTES));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted.subarray(offset)),
    decipher.final(),
  ]).toString('utf8');
};
