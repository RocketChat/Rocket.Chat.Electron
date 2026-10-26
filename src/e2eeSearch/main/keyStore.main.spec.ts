import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createKeyStore,
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  INDEX_KEY_BYTES,
  KEY_FILE_NAME,
} from '../keyStore';

type Backend = ReturnType<Electron.SafeStorage['getSelectedStorageBackend']>;

// A reversible stand-in for the OS keychain. It marks the wrapped bytes, so a
// test can see that the key file never holds the raw key.
const fakeSafeStorage = ({
  available = true,
  backend = 'gnome_libsecret' as Backend,
  shouldReEncrypt = false,
} = {}) => ({
  isAsyncEncryptionAvailable: jest.fn(async () => available),
  getSelectedStorageBackend: jest.fn(() => backend),
  encryptStringAsync: jest.fn(async (plain: string) =>
    Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`)
  ),
  decryptStringAsync: jest.fn(async (encrypted: Buffer) => {
    const text = encrypted.toString();
    if (!text.startsWith('wrapped:')) throw new Error('Error while decrypting');
    return {
      result: Buffer.from(text.slice('wrapped:'.length), 'hex').toString(),
      shouldReEncrypt,
    };
  }),
});

describe('e2eeSearch key store', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'e2ee-key-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates a wrapped key and reads the same key back', async () => {
    const safeStorage = fakeSafeStorage();
    const first = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();

    expect(first).toMatchObject({ persistent: true, reset: false });
    expect(first.key).toHaveLength(INDEX_KEY_BYTES);

    const onDisk = await readFile(path.join(dir, KEY_FILE_NAME));
    expect(onDisk.includes(first.key)).toBe(false);
    expect(onDisk.includes(Buffer.from(first.key.toString('base64')))).toBe(
      false
    );

    const second = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();
    expect(second).toMatchObject({ persistent: true, reset: false });
    expect(second.key.equals(first.key)).toBe(true);
    expect(await readdir(dir)).toEqual([KEY_FILE_NAME]);
  });

  it('does not ask for the Linux backend on other platforms', async () => {
    const safeStorage = fakeSafeStorage({ backend: 'unknown' });
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'darwin',
    }).load();

    expect(loaded.persistent).toBe(true);
    expect(safeStorage.getSelectedStorageBackend).not.toHaveBeenCalled();
  });

  it.each(['basic_text', 'unknown'] as Backend[])(
    'keeps the key in memory only with the %s backend',
    async (backend) => {
      const safeStorage = fakeSafeStorage({ backend });
      const loaded = await createKeyStore({
        dir,
        safeStorage,
        platform: 'linux',
      }).load();

      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'basic-text-backend',
      });
      expect(loaded.key).toHaveLength(INDEX_KEY_BYTES);
      expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled();
      expect(await readdir(dir)).toEqual([]);
    }
  );

  it('keeps the key in memory only when encryption is not available', async () => {
    const safeStorage = fakeSafeStorage({ available: false });
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'win32',
    }).load();

    expect(loaded).toMatchObject({
      persistent: false,
      reason: 'no-encryption',
    });
    expect(await readdir(dir)).toEqual([]);
  });

  it.each([
    ['a key file that does not decrypt', Buffer.from('garbage')],
    [
      'a key of the wrong length',
      Buffer.from(`wrapped:${Buffer.from('c2hvcnQ=').toString('hex')}`),
    ],
  ])('replaces %s with a new key and reports a reset', async (_, content) => {
    await writeFile(path.join(dir, KEY_FILE_NAME), content);
    const safeStorage = fakeSafeStorage();

    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();
    expect(loaded).toMatchObject({ persistent: true, reset: true });

    const again = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();
    expect(again).toMatchObject({ persistent: true, reset: false });
    expect(again.key.equals(loaded.key)).toBe(true);
  });

  it('re-wraps the key when the keychain asks for it', async () => {
    const store = createKeyStore({
      dir,
      safeStorage: fakeSafeStorage(),
      platform: 'darwin',
    });
    const created = await store.load();

    const rotating = fakeSafeStorage({ shouldReEncrypt: true });
    const loaded = await createKeyStore({
      dir,
      safeStorage: rotating,
      platform: 'darwin',
    }).load();

    expect(loaded.key.equals(created.key)).toBe(true);
    expect(rotating.encryptStringAsync).toHaveBeenCalledTimes(1);
    expect(await readdir(dir)).toEqual([KEY_FILE_NAME]);
  });

  // The web client derives a key from the user's E2EE
  // private key. The index key is wrapped by that key inside the keychain
  // wrap, so a page that does not hold the private key cannot open the index.
  describe('with a wrap key from the E2EE private key', () => {
    const wrapKey = Buffer.alloc(32, 7);
    const otherWrapKey = Buffer.alloc(32, 8);

    const load = (wrap?: Buffer) =>
      createKeyStore({
        dir,
        safeStorage: fakeSafeStorage(),
        platform: 'darwin',
      }).load(wrap ? { wrapKey: wrap } : undefined);

    it('gives the same index key back with the same wrap key', async () => {
      const created = await load(wrapKey);
      const again = await load(wrapKey);

      expect(created).toMatchObject({ persistent: true, reset: false });
      expect(again).toMatchObject({ persistent: true, reset: false });
      expect(again.key.equals(created.key)).toBe(true);
    });

    it('does not keep the index key readable with the keychain only', async () => {
      const created = await load(wrapKey);
      const unwrapped = (await fakeSafeStorage().decryptStringAsync(
        await readFile(path.join(dir, KEY_FILE_NAME))
      )) as { result: string };

      expect(unwrapped.result.includes(created.key.toString('base64'))).toBe(
        false
      );
      expect(
        Buffer.from(unwrapped.result, 'latin1').includes(created.key)
      ).toBe(false);
    });

    it.each([
      ['another wrap key', () => otherWrapKey],
      ['no wrap key', () => undefined],
    ])('refuses %s and keeps the key file as it is', async (_, wrap) => {
      await load(wrapKey);
      const before = await readFile(path.join(dir, KEY_FILE_NAME));

      await expect(load(wrap())).rejects.toMatchObject({
        name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
      });
      expect(
        (await readFile(path.join(dir, KEY_FILE_NAME))).equals(before)
      ).toBe(true);

      const right = await load(wrapKey);
      expect(right).toMatchObject({ persistent: true, reset: false });
    });

    it('wraps an old key file with the wrap key and keeps the index key', async () => {
      const old = await load();
      const upgraded = await load(wrapKey);

      expect(upgraded).toMatchObject({ persistent: true, reset: false });
      expect(upgraded.key.equals(old.key)).toBe(true);
      await expect(load()).rejects.toMatchObject({
        name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
      });
    });

    // The user index limiter keeps a sealed index on a logout.
    it('tells a sealed key file from a plain, missing or lost one', async () => {
      const store = createKeyStore({
        dir,
        safeStorage: fakeSafeStorage(),
        platform: 'darwin',
      });
      await expect(store.isSealed()).resolves.toBe(false);
      await load();
      await expect(store.isSealed()).resolves.toBe(false);
      await load(wrapKey);
      await expect(store.isSealed()).resolves.toBe(true);
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('garbage'));
      await expect(store.isSealed()).resolves.toBe(false);
    });

    it('makes a new key when the keychain cannot unwrap the file', async () => {
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('garbage'));

      const loaded = await load(wrapKey);
      expect(loaded).toMatchObject({ persistent: true, reset: true });
      expect((await load(wrapKey)).key.equals(loaded.key)).toBe(true);
    });
  });

  it('removes the key file', async () => {
    const store = createKeyStore({
      dir,
      safeStorage: fakeSafeStorage(),
      platform: 'darwin',
    });
    await store.load();
    await store.remove();
    await store.remove();

    expect(await readdir(dir)).toEqual([]);
  });
});
