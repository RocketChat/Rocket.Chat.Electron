import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createDevTestKeySafeStorage,
  DEV_TEST_KEY_FILE_NAME,
  selectKeySource,
} from '../devTestKey';
import { createKeyStore, KEY_FILE_NAME } from '../keyStore';

describe('e2eeSearch dev test key', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'e2ee-devkey-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const load = (profile: string) =>
    createKeyStore({
      dir: path.join(profile, 'index'),
      safeStorage: createDevTestKeySafeStorage(
        path.join(profile, DEV_TEST_KEY_FILE_NAME)
      ),
      platform: 'darwin',
    }).load();

  it('is used only by a development build with the flag', () => {
    const flag = { ROCKETCHAT_E2EE_SEARCH_DEV_TEST_KEY: 'true' };
    expect(selectKeySource('production', flag, false)).toBe('os-keychain');
    expect(selectKeySource(undefined, flag, false)).toBe('os-keychain');
    expect(selectKeySource('development', {}, false)).toBe('os-keychain');
    expect(selectKeySource('development', flag, false)).toBe('dev-test-key');
    expect(
      selectKeySource(
        'development',
        {
          ...flag,
          ROCKETCHAT_E2EE_SEARCH_MEMORY_ONLY: 'true',
        },
        false
      )
    ).toBe('memory-only');
  });

  it('is never used by a packaged app, also when the build left NODE_ENV as development', () => {
    const flags = {
      ROCKETCHAT_E2EE_SEARCH_DEV_TEST_KEY: 'true',
      ROCKETCHAT_E2EE_SEARCH_MEMORY_ONLY: 'true',
    };
    expect(selectKeySource('development', flags, true)).toBe('os-keychain');
    expect(
      selectKeySource(
        'development',
        { ROCKETCHAT_E2EE_SEARCH_DEV_TEST_KEY: 'true' },
        true
      )
    ).toBe('os-keychain');
    expect(selectKeySource('development', flags, false)).toBe('memory-only');
  });

  it('gives a persistent key that survives a restart', async () => {
    const first = await load(dir);
    expect(first.persistent).toBe(true);
    if (!first.persistent) return;
    expect(first.reset).toBe(false);

    const wrapped = await readFile(path.join(dir, 'index', KEY_FILE_NAME));
    expect(wrapped.includes(first.key)).toBe(false);
    expect(wrapped.includes(Buffer.from(first.key.toString('base64')))).toBe(
      false
    );

    // A new storage instance reads the same files, as after an app restart.
    const second = await load(dir);
    expect(second).toEqual({ persistent: true, key: first.key, reset: false });
  });

  it('uses a different random key in each dev profile', async () => {
    const other = await mkdtemp(path.join(tmpdir(), 'e2ee-devkey-'));
    try {
      await load(dir);
      await load(other);
      const a = await readFile(path.join(dir, DEV_TEST_KEY_FILE_NAME));
      const b = await readFile(path.join(other, DEV_TEST_KEY_FILE_NAME));
      expect(a).toHaveLength(32);
      expect(a.equals(b)).toBe(false);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });

  it('starts a new key when the dev test key is gone', async () => {
    const first = await load(dir);
    await rm(path.join(dir, DEV_TEST_KEY_FILE_NAME));
    const second = await load(dir);
    expect(second.persistent).toBe(true);
    if (!second.persistent) return;
    expect(second.reset).toBe(true);
    expect(second.key.equals(first.key)).toBe(false);
  });

  it('rejects a tampered wrapped key', async () => {
    const storage = createDevTestKeySafeStorage(
      path.join(dir, DEV_TEST_KEY_FILE_NAME)
    );
    const wrapped = await storage.encryptStringAsync('secret');
    wrapped[wrapped.length - 1] ^= 0xff;
    await expect(storage.decryptStringAsync(wrapped)).rejects.toThrow();
  });
});
