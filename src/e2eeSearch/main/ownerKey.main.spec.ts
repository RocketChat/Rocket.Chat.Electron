import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchHost } from '../host';
import type { SearchHost } from '../host';
import {
  createKeyStore,
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  KEY_FILE_NAME,
} from '../keyStore';
import type { SafeStorageApi } from '../keyStore';
import { createUserIndexLimiter } from '../lifecycle';
import {
  fingerprintPublicKey,
  loadOwnedIndexKey,
  OWNER_KEY_FILE_NAME,
} from '../ownerKey';
import type { OwnerKeyFingerprint } from '../ownerKey';
import { SNAPSHOT_FILE_NAME } from '../snapshotStore';
import type { E2EESearchDoc } from '../types';
import { createFakeWorkers } from './fakeWorkers';

const docs = (count: number): E2EESearchDoc[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    rid: 'r1',
    uid: 'u1',
    username: 'ana',
    ts: 1000 + i,
    updatedAt: 1000 + i,
    kind: 'text' as const,
    body: `message ${i}`,
  }));

// The public key as the web client uploads it: `JSON.stringify` of the
// exported RSA-OAEP JWK.
const publicKeyJwk = (n: string) =>
  JSON.stringify({
    alg: 'RSA-OAEP-256',
    e: 'AQAB',
    ext: true,
    key_ops: ['encrypt'],
    kty: 'RSA',
    n,
  });

describe('fingerprintPublicKey', () => {
  it('hashes the RSA members only, in a fixed order (RFC 7638)', () => {
    const expected = createHash('sha256')
      .update('{"e":"AQAB","kty":"RSA","n":"abc"}')
      .digest('hex');
    expect(fingerprintPublicKey(publicKeyJwk('abc'))).toBe(expected);
    expect(
      fingerprintPublicKey('{"n":"abc","kty":"RSA","e":"AQAB","ext":false}')
    ).toBe(expected);
  });

  it('gives another fingerprint for another key', () => {
    expect(fingerprintPublicKey(publicKeyJwk('abc'))).not.toBe(
      fingerprintPublicKey(publicKeyJwk('abd'))
    );
  });

  it('gives no fingerprint for a value that is not an RSA public key', () => {
    expect(fingerprintPublicKey('not json')).toBeUndefined();
    expect(fingerprintPublicKey('null')).toBeUndefined();
    expect(
      fingerprintPublicKey('{"kty":"EC","x":"a","y":"b"}')
    ).toBeUndefined();
    expect(fingerprintPublicKey('{"kty":"RSA","n":"abc"}')).toBeUndefined();
  });
});

// The index stores the fingerprint of the user's E2EE
// public key. At each open, main compares it with the public key that the
// server holds for the user. A changed key replaces the index. A wrong wrap
// key alone never deletes it.
describe('E2EE search index and the owner E2EE key', () => {
  let root: string;
  let serverDir: string;
  let dir: string;
  let host: SearchHost;
  let keyChanges: number;
  const oldWrapKey = Buffer.alloc(32, 3);
  const newWrapKey = Buffer.alloc(32, 9);
  const oldOwnerKey = fingerprintPublicKey(publicKeyJwk('old-key'));
  const newOwnerKey = fingerprintPublicKey(publicKeyJwk('new-key'));

  // A reversible stand-in for the OS keychain.
  const keychain: SafeStorageApi = {
    isAsyncEncryptionAvailable: async () => true,
    getSelectedStorageBackend: () => 'gnome_libsecret',
    encryptStringAsync: async (plain: string) =>
      Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`),
    decryptStringAsync: async (encrypted: Buffer) => ({
      result: Buffer.from(
        encrypted.toString().slice('wrapped:'.length),
        'hex'
      ).toString(),
      shouldReEncrypt: false,
    }),
  };
  const noKeychain: SafeStorageApi = {
    ...keychain,
    isAsyncEncryptionAvailable: async () => false,
  };

  // Like openE2EESearchIndex in setup.ts.
  const openWith =
    (
      wrapKey: Buffer | undefined,
      ownerKey: OwnerKeyFingerprint,
      safeStorage: SafeStorageApi = keychain
    ) =>
    async (): Promise<string> => {
      const indexKey = await loadOwnedIndexKey({
        dir,
        ownerKey,
        host,
        loadKey: () =>
          createKeyStore({ dir, safeStorage, platform: 'darwin' }).load(
            wrapKey ? { wrapKey: Buffer.from(wrapKey) } : undefined
          ),
        onOwnerKeyChanged: () => {
          keyChanges++;
        },
      });
      await host.open(dir, { userId: 'user-a', dir, indexKey });
      return dir;
    };

  const limiter = () => createUserIndexLimiter({ host });
  const admit = (open: () => Promise<string>) =>
    limiter().admit(serverDir, 'user-a', open);

  const hits = async (indexId: string) =>
    (await host.call(indexId, 'search', { text: 'message' })) as unknown[];

  const storedOwnerKey = () => {
    const file = path.join(dir, OWNER_KEY_FILE_NAME);
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  };

  // An index of 20 messages on disk, sealed by the old wrap key.
  const createIndex = async (ownerKey: OwnerKeyFingerprint) => {
    const indexId = await admit(openWith(oldWrapKey, ownerKey));
    await host.call(indexId, 'upsert', docs(20));
    await host.close(indexId);
    expect(existsSync(path.join(dir, SNAPSHOT_FILE_NAME))).toBe(true);
    return {
      key: readFileSync(path.join(dir, KEY_FILE_NAME)),
      snapshot: readFileSync(path.join(dir, SNAPSHOT_FILE_NAME)),
    };
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-owner-key-'));
    serverDir = path.join(root, 'a'.repeat(64));
    dir = path.join(serverDir, 'user-a');
    host = createSearchHost({ spawn: createFakeWorkers().spawn });
    keyChanges = 0;
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('stores the fingerprint of the owner key when it creates the index', async () => {
    await createIndex(oldOwnerKey);
    expect(storedOwnerKey()).toBe(oldOwnerKey);
  });

  it('deletes and replaces the index when the server has another public key', async () => {
    const before = await createIndex(oldOwnerKey);

    const replaced = await admit(openWith(newWrapKey, newOwnerKey));
    expect(await hits(replaced)).toHaveLength(0);
    expect(keyChanges).toBe(1);
    expect(storedOwnerKey()).toBe(newOwnerKey);
    expect(readFileSync(path.join(dir, KEY_FILE_NAME)).equals(before.key)).toBe(
      false
    );
    expect(existsSync(path.join(dir, SNAPSHOT_FILE_NAME))).toBe(false);

    // The new index opens again with the new wrap key, and keeps its rows.
    await host.call(replaced, 'upsert', docs(5));
    await host.close(replaced);
    const reopened = await admit(openWith(newWrapKey, newOwnerKey));
    expect(await hits(reopened)).toHaveLength(5);
    expect(keyChanges).toBe(1);
  });

  it('discards an open index of the old key, so no save writes it again', async () => {
    const indexId = await admit(openWith(oldWrapKey, oldOwnerKey));
    await host.call(indexId, 'upsert', docs(20));
    expect(host.hasUnsavedChanges()).toBe(true);

    const replaced = await admit(openWith(newWrapKey, newOwnerKey));
    // The unsaved rows of the old key are dropped, not saved later.
    expect(host.hasUnsavedChanges()).toBe(false);
    await host.close(replaced);
    const reopened = await admit(openWith(newWrapKey, newOwnerKey));
    expect(await hits(reopened)).toHaveLength(0);
    expect(keyChanges).toBe(1);
  });

  // A key reset removes the key from the server. The client opens the index
  // with its new key before it uploads the new public key.
  it('deletes and replaces the index when the server has no public key for the user', async () => {
    await createIndex(oldOwnerKey);

    const replaced = await admit(openWith(newWrapKey, null));
    expect(await hits(replaced)).toHaveLength(0);
    expect(keyChanges).toBe(1);
    expect(storedOwnerKey()).toBeUndefined();

    // The next open with the uploaded key adds its fingerprint.
    await host.close(replaced);
    await admit(openWith(newWrapKey, newOwnerKey));
    expect(storedOwnerKey()).toBe(newOwnerKey);
  });

  it('refuses a wrong wrap key and keeps key.bin when the public key matches', async () => {
    const before = await createIndex(oldOwnerKey);

    await expect(
      admit(openWith(newWrapKey, oldOwnerKey))
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    expect(keyChanges).toBe(0);
    expect(readFileSync(path.join(dir, KEY_FILE_NAME)).equals(before.key)).toBe(
      true
    );
    expect(
      readFileSync(path.join(dir, SNAPSHOT_FILE_NAME)).equals(before.snapshot)
    ).toBe(true);
    expect(storedOwnerKey()).toBe(oldOwnerKey);

    expect(
      await hits(await admit(openWith(oldWrapKey, oldOwnerKey)))
    ).toHaveLength(20);
  });

  it('deletes nothing when the server cannot tell the public key', async () => {
    const before = await createIndex(oldOwnerKey);

    await expect(admit(openWith(newWrapKey, undefined))).rejects.toMatchObject({
      name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
    });
    expect(keyChanges).toBe(0);
    expect(readFileSync(path.join(dir, KEY_FILE_NAME)).equals(before.key)).toBe(
      true
    );
    expect(
      readFileSync(path.join(dir, SNAPSHOT_FILE_NAME)).equals(before.snapshot)
    ).toBe(true);
    expect(storedOwnerKey()).toBe(oldOwnerKey);

    // With the right wrap key, the open works as before.
    expect(
      await hits(await admit(openWith(oldWrapKey, undefined)))
    ).toHaveLength(20);
  });

  it('adds the fingerprint to an index that has none on a valid open', async () => {
    await createIndex(undefined);
    expect(storedOwnerKey()).toBeUndefined();

    const reopened = await admit(openWith(oldWrapKey, oldOwnerKey));
    expect(await hits(reopened)).toHaveLength(20);
    expect(storedOwnerKey()).toBe(oldOwnerKey);
    expect(keyChanges).toBe(0);
  });

  it('keeps an index with no fingerprint when the wrap key is wrong', async () => {
    const before = await createIndex(undefined);

    await expect(
      admit(openWith(newWrapKey, newOwnerKey))
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    expect(keyChanges).toBe(0);
    expect(readFileSync(path.join(dir, KEY_FILE_NAME)).equals(before.key)).toBe(
      true
    );
    expect(storedOwnerKey()).toBeUndefined();
  });

  it('treats a damaged fingerprint file as no fingerprint', async () => {
    const before = await createIndex(oldOwnerKey);
    writeFileSync(path.join(dir, OWNER_KEY_FILE_NAME), 'not a fingerprint');

    await expect(
      admit(openWith(newWrapKey, newOwnerKey))
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    expect(readFileSync(path.join(dir, KEY_FILE_NAME)).equals(before.key)).toBe(
      true
    );
  });

  it('writes no fingerprint for a memory-only index', async () => {
    const indexId = await admit(openWith(newWrapKey, newOwnerKey, noKeychain));
    expect(await hits(indexId)).toHaveLength(0);
    expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
  });
});
