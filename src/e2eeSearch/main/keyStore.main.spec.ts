import type * as NodeCrypto from 'node:crypto';
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

  // The index files of an open index. A key file that Chromium wrapped with
  // its hard-coded password seals them, so they leave with it. The temp file
  // is a save that a kill stopped.
  const INDEX_FILES = [
    'index.db',
    'index.db-wal',
    'index.db-shm',
    'index.bin',
    'index.bin.123.1700000000000.tmp',
  ];
  const writeIndexFiles = () =>
    Promise.all(
      INDEX_FILES.map((name) => writeFile(path.join(dir, name), 'index'))
    );
  const listDir = async () => (await readdir(dir)).sort();

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

  // GNOME with no default keyring: the user cancels the "Choose password for
  // new keyring" prompt, and Chromium wraps with its hard-coded Linux key
  // (prefix v10) while the backend still reads gnome_libsecret.
  it('keeps the key in memory only when Linux wraps with the hard-coded key', async () => {
    const safeStorage = fakeSafeStorage();
    safeStorage.encryptStringAsync.mockImplementation(async (plain: string) =>
      Buffer.concat([Buffer.from('v10'), Buffer.from(plain)])
    );
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();

    expect(loaded).toMatchObject({
      persistent: false,
      reason: 'hard-coded-wrap',
    });
    expect(await readdir(dir)).toEqual([]);
  });

  it('does not trust a Linux key file wrapped with the hard-coded key', async () => {
    const safeStorage = fakeSafeStorage();
    const oldKey = Buffer.alloc(INDEX_KEY_BYTES, 7);
    await writeFile(
      path.join(dir, KEY_FILE_NAME),
      Buffer.concat([
        Buffer.from('v10'),
        Buffer.from(oldKey.toString('base64')),
      ])
    );
    safeStorage.decryptStringAsync.mockImplementation(
      async (encrypted: Buffer) => ({
        result: encrypted.subarray(3).toString(),
        shouldReEncrypt: false,
      })
    );
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();

    expect(loaded).toMatchObject({ persistent: true, reset: true });
    expect(loaded.key.equals(oldKey)).toBe(false);
    const onDisk = await readFile(path.join(dir, KEY_FILE_NAME));
    expect(onDisk.subarray(0, 3).toString()).not.toBe('v10');
  });

  it('removes a hard-coded-key file when the new wrap is also hard-coded', async () => {
    const safeStorage = fakeSafeStorage();
    safeStorage.encryptStringAsync.mockImplementation(async (plain: string) =>
      Buffer.concat([Buffer.from('v10'), Buffer.from(plain)])
    );
    await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();

    expect(loaded).toMatchObject({ persistent: false });
    expect(await readdir(dir)).toEqual([]);
  });

  it('keeps a v10 key file on macOS, where v10 is the keychain prefix', async () => {
    const safeStorage = fakeSafeStorage();
    safeStorage.encryptStringAsync.mockImplementation(async (plain: string) =>
      Buffer.concat([Buffer.from('v10'), Buffer.from(plain)])
    );
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'darwin',
    }).load();

    expect(loaded).toMatchObject({ persistent: true });
    expect(await readdir(dir)).toEqual([KEY_FILE_NAME]);
  });

  // A memory-only load leaves the index on disk, so it must not
  // leave next to it a key file that anyone can unwrap.
  it('removes a Linux hard-coded-key file when the key stays in memory only', async () => {
    const safeStorage = fakeSafeStorage({ backend: 'basic_text' });
    await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
    const loaded = await createKeyStore({
      dir,
      safeStorage,
      platform: 'linux',
    }).load();

    expect(loaded).toMatchObject({
      persistent: false,
      reason: 'basic-text-backend',
    });
    expect(await readdir(dir)).toEqual([]);
  });

  describe('with a Linux hard-coded-key file and an index on disk', () => {
    const hardCodedStorage = (backend: Backend) => {
      const safeStorage = fakeSafeStorage({ backend });
      safeStorage.encryptStringAsync.mockImplementation(async (plain: string) =>
        Buffer.concat([Buffer.from('v10'), Buffer.from(plain)])
      );
      return safeStorage;
    };

    it('removes the index files with the key file when the key stays in memory only', async () => {
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
      await writeIndexFiles();

      const loaded = await createKeyStore({
        dir,
        safeStorage: hardCodedStorage('basic_text'),
        platform: 'linux',
      }).load();

      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'basic-text-backend',
      });
      expect(await listDir()).toEqual([]);
    });

    it('removes the index files with the key file when the new wrap is also hard-coded', async () => {
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
      await writeIndexFiles();

      const loaded = await createKeyStore({
        dir,
        safeStorage: hardCodedStorage('gnome_libsecret'),
        platform: 'linux',
      }).load();

      expect(loaded).toMatchObject({ persistent: false });
      expect(await listDir()).toEqual([]);
    });

    it('keeps the index files with a key file that is not a v10 wrap', async () => {
      const safeStorage = fakeSafeStorage();
      safeStorage.encryptStringAsync.mockImplementation(async (plain: string) =>
        Buffer.concat([Buffer.from('v11'), Buffer.from(plain)])
      );
      safeStorage.decryptStringAsync.mockImplementation(
        async (encrypted: Buffer) => ({
          result: encrypted.subarray(3).toString(),
          shouldReEncrypt: false,
        })
      );
      const first = await createKeyStore({
        dir,
        safeStorage,
        platform: 'linux',
      }).load();
      await writeIndexFiles();

      const again = await createKeyStore({
        dir,
        safeStorage,
        platform: 'linux',
      }).load();

      expect(again).toMatchObject({ persistent: true, reset: false });
      expect(again.key.equals(first.key)).toBe(true);
      expect(await listDir()).toEqual([KEY_FILE_NAME, ...INDEX_FILES].sort());
    });
  });

  it('keeps a keychain-wrapped key file when the key stays in memory only', async () => {
    const persistent = await createKeyStore({
      dir,
      safeStorage: fakeSafeStorage(),
      platform: 'darwin',
    }).load();
    const keyFile = await readFile(path.join(dir, KEY_FILE_NAME));

    const loaded = await createKeyStore({
      dir,
      safeStorage: fakeSafeStorage({ available: false }),
      platform: 'darwin',
    }).load();

    expect(loaded).toMatchObject({
      persistent: false,
      reason: 'no-encryption',
    });
    expect(loaded.key.equals(persistent.key)).toBe(false);
    expect(await readFile(path.join(dir, KEY_FILE_NAME))).toEqual(keyFile);
  });

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

    // The key encryption key that HKDF derives from the wrap
    // key, and the decrypted part of the index key, are zeroed after use.
    it('zeroes each derived key after a seal, an open and a refused open', async () => {
      // The module object itself, which keyStore.ts reads on each call.
      const crypto = jest.requireActual<typeof NodeCrypto>('node:crypto');
      const derived: ArrayBuffer[] = [];
      const decrypted: Buffer[] = [];
      const { hkdfSync, createDecipheriv } = crypto;
      const hkdfSpy = jest
        .spyOn(crypto, 'hkdfSync')
        .mockImplementation((...args: Parameters<typeof hkdfSync>) => {
          const key = hkdfSync(...args);
          derived.push(key);
          return key;
        });
      const decipherSpy = jest
        .spyOn(crypto, 'createDecipheriv')
        .mockImplementation(((...args: Parameters<typeof createDecipheriv>) => {
          const decipher = createDecipheriv(...args);
          const update = decipher.update.bind(decipher) as (
            data: Buffer
          ) => Buffer;
          (decipher as unknown as { update: typeof update }).update = (
            data
          ) => {
            const part = update(data);
            decrypted.push(part);
            return part;
          };
          return decipher;
        }) as typeof createDecipheriv);
      try {
        const created = await load(wrapKey);
        const opened = await load(wrapKey);
        await expect(load(otherWrapKey)).rejects.toMatchObject({
          name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
        });

        expect(opened.key.equals(created.key)).toBe(true);
        expect(created.key.some((byte) => byte !== 0)).toBe(true);
      } finally {
        hkdfSpy.mockRestore();
        decipherSpy.mockRestore();
      }

      const isZero = (bytes: Uint8Array) => bytes.every((byte) => byte === 0);
      expect(derived).toHaveLength(3);
      expect(derived.map((key) => isZero(new Uint8Array(key)))).toEqual([
        true,
        true,
        true,
      ]);
      expect(decrypted.length).toBeGreaterThan(0);
      expect(decrypted.map(isZero)).toEqual(decrypted.map(() => true));
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

  // GNOME with no default keyring keeps a keyring prompt open,
  // and safeStorage does not answer while the prompt stays up.
  describe('when the keychain does not answer', () => {
    const KEYCHAIN_TIMEOUT_MS = 50;
    const never = <T>() => new Promise<T>(() => undefined);
    const settlesWithin = async <T>(promise: Promise<T>, ms = 2_000) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error(`did not settle in ${ms} ms`)),
              ms
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
    const storeWith = (safeStorage: ReturnType<typeof fakeSafeStorage>) =>
      createKeyStore({
        dir,
        safeStorage,
        platform: 'linux',
        keychainTimeoutMs: KEYCHAIN_TIMEOUT_MS,
      });

    it('opens memory-only when the wrap does not return', async () => {
      const safeStorage = fakeSafeStorage();
      safeStorage.encryptStringAsync.mockImplementation(() => never());

      const loaded = await settlesWithin(storeWith(safeStorage).load());

      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'keychain-timeout',
      });
      expect(loaded.key).toHaveLength(INDEX_KEY_BYTES);
      expect(await readdir(dir)).toEqual([]);
    });

    it('opens memory-only when the availability check does not return', async () => {
      const safeStorage = fakeSafeStorage();
      safeStorage.isAsyncEncryptionAvailable.mockImplementation(() => never());

      const loaded = await settlesWithin(storeWith(safeStorage).load());

      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'keychain-timeout',
      });
      expect(await readdir(dir)).toEqual([]);
    });

    it('keeps the key file as it is when its unwrap does not return', async () => {
      const safeStorage = fakeSafeStorage();
      const first = await storeWith(safeStorage).load();
      const before = await readFile(path.join(dir, KEY_FILE_NAME));
      safeStorage.decryptStringAsync.mockImplementation(() => never());

      const loaded = await settlesWithin(storeWith(safeStorage).load());

      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'keychain-timeout',
      });
      expect(loaded.key.equals(first.key)).toBe(false);
      expect(await readdir(dir)).toEqual([KEY_FILE_NAME]);
      expect(
        (await readFile(path.join(dir, KEY_FILE_NAME))).equals(before)
      ).toBe(true);
    });

    it('writes nothing when the keychain answers after the time limit', async () => {
      const safeStorage = fakeSafeStorage();
      let answer: () => void = () => undefined;
      safeStorage.encryptStringAsync.mockImplementation(
        (plain: string) =>
          new Promise<Buffer>((resolve) => {
            answer = () =>
              resolve(
                Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`)
              );
          })
      );

      const loaded = await settlesWithin(storeWith(safeStorage).load());
      expect(loaded.persistent).toBe(false);

      answer();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await readdir(dir)).toEqual([]);
    });

    // A late answer deletes nothing, as it writes no key file.
    it('deletes no index file when the wrap answers late with a hard-coded wrap', async () => {
      const safeStorage = fakeSafeStorage();
      let answer: () => void = () => undefined;
      safeStorage.encryptStringAsync.mockImplementation(
        () =>
          new Promise<Buffer>((resolve) => {
            answer = () =>
              resolve(Buffer.concat([Buffer.from('v10'), Buffer.from('late')]));
          })
      );
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
      await writeIndexFiles();
      const before = await listDir();

      const loaded = await settlesWithin(storeWith(safeStorage).load());
      expect(loaded.persistent).toBe(false);

      answer();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await listDir()).toEqual(before);
      expect(await readFile(path.join(dir, KEY_FILE_NAME), 'utf8')).toBe(
        'v10old'
      );
    });

    it('deletes no index file when the availability check answers late with a hard-coded key file', async () => {
      const safeStorage = fakeSafeStorage({ backend: 'basic_text' });
      let answer: (available: boolean) => void = () => undefined;
      safeStorage.isAsyncEncryptionAvailable.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            answer = resolve;
          })
      );
      await writeFile(path.join(dir, KEY_FILE_NAME), Buffer.from('v10old'));
      await writeIndexFiles();
      const before = await listDir();

      const loaded = await settlesWithin(storeWith(safeStorage).load());
      expect(loaded).toMatchObject({
        persistent: false,
        reason: 'keychain-timeout',
      });

      answer(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await listDir()).toEqual(before);
    });

    // The open clears the wrap key when the load returns. A late re-wrap of an
    // old key file would seal the index key with a key of zeros.
    it('does not re-wrap an old key file when its unwrap answers after the time limit', async () => {
      const safeStorage = fakeSafeStorage();
      await storeWith(safeStorage).load();
      const before = await readFile(path.join(dir, KEY_FILE_NAME));
      const unwrapNow = safeStorage.decryptStringAsync.getMockImplementation();
      let answer: () => void = () => undefined;
      safeStorage.decryptStringAsync.mockImplementation(
        (encrypted: Buffer) =>
          new Promise((resolve, reject) => {
            answer = () => unwrapNow?.(encrypted).then(resolve, reject);
          })
      );
      const wrapKey = Buffer.alloc(32, 7);

      const loaded = await settlesWithin(
        storeWith(safeStorage).load({ wrapKey })
      );
      expect(loaded.persistent).toBe(false);
      wrapKey.fill(0);

      answer();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(safeStorage.encryptStringAsync).toHaveBeenCalledTimes(2);
      expect(
        (await readFile(path.join(dir, KEY_FILE_NAME))).equals(before)
      ).toBe(true);
    });

    it('waits for a keychain that answers within the time limit', async () => {
      const safeStorage = fakeSafeStorage();
      safeStorage.encryptStringAsync.mockImplementation(async (plain) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`);
      });

      const loaded = await createKeyStore({
        dir,
        safeStorage,
        platform: 'linux',
        keychainTimeoutMs: 1_000,
      }).load();

      expect(loaded).toMatchObject({ persistent: true, reset: false });
      expect(await readdir(dir)).toEqual([KEY_FILE_NAME]);
    });

    // A logout then deletes the index, as for a key file that is lost.
    it('does not call the index sealed when the unwrap does not return', async () => {
      const safeStorage = fakeSafeStorage();
      await storeWith(safeStorage).load({ wrapKey: Buffer.alloc(32, 7) });
      safeStorage.decryptStringAsync.mockImplementation(() => never());

      await expect(
        settlesWithin(storeWith(safeStorage).isSealed())
      ).resolves.toBe(false);
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
