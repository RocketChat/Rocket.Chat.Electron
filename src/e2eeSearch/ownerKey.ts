import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { IndexKey } from './keyStore';

// The index folder keeps the fingerprint of the E2EE
// public key of the user that owned it when the index was made. The
// fingerprint is not secret, but it stays inside the hashed index folder.
export const OWNER_KEY_FILE_NAME = 'owner-key.sha256';

export const E2EE_SEARCH_OWNER_KEY_CHANGED_ERROR_NAME =
  'E2EESearchOwnerKeyChangedError';

// Logged when an open replaces the index of a changed E2EE key. Its name is
// the only part that goes to the log.
export class E2EESearchOwnerKeyChangedError extends Error {
  constructor() {
    super('E2EE search index belongs to an old E2EE key');
    this.name = E2EE_SEARCH_OWNER_KEY_CHANGED_ERROR_NAME;
  }
}

// What the server says about the user's E2EE public key:
// - a string: the fingerprint of the key that the server holds;
// - null: the server holds no key for the user (a key reset removes it);
// - undefined: unknown (no answer, an error, or a key of another shape).
export type OwnerKeyFingerprint = string | null | undefined;

const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;

// SHA-256 of the RFC 7638 form of the public JWK that the web client uploads
// (`JSON.stringify` of an RSA-OAEP key): the required members only, in
// lexicographic order. A new upload of the same key with other optional
// members, or in another member order, keeps the same fingerprint.
export const fingerprintPublicKey = (publicKey: string): string | undefined => {
  let jwk: unknown;
  try {
    jwk = JSON.parse(publicKey);
  } catch {
    return undefined;
  }
  if (typeof jwk !== 'object' || jwk === null) return undefined;
  const { kty, n, e } = jwk as Record<string, unknown>;
  if (kty !== 'RSA' || typeof n !== 'string' || typeof e !== 'string') {
    return undefined;
  }
  return createHash('sha256')
    .update(JSON.stringify({ e, kty, n }))
    .digest('hex');
};

// Undefined when the file is missing or does not hold a fingerprint.
const readStoredFingerprint = async (
  dir: string
): Promise<string | undefined> => {
  try {
    const text = await readFile(path.join(dir, OWNER_KEY_FILE_NAME), 'utf8');
    return FINGERPRINT_PATTERN.test(text) ? text : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

const writeStoredFingerprint = async (dir: string, fingerprint: string) => {
  const file = path.join(dir, OWNER_KEY_FILE_NAME);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, fingerprint, { mode: 0o600 });
  await rename(temp, file);
};

type LoadOwnedIndexKeyOptions = {
  // The index folder of one user of one server.
  dir: string;
  // From the server, never from the page.
  ownerKey: OwnerKeyFingerprint;
  // Loads the index key from the key store of `dir`.
  loadKey(): Promise<IndexKey>;
  host: { indexIds(): string[]; discard(indexId: string): Promise<void> };
  onOwnerKeyChanged?(): void;
};

// Loads the index key of `dir` for the user's current E2EE key. Call it
// inside the open task of the user index limiter, so no other task of the
// server runs at the same time.
// - The stored fingerprint and the server's key differ: the user's E2EE key
//   changed, here or on another device. The new key can never open the old
//   index, so the folder (snapshot and key file) goes, and the key store
//   makes a new index.
// - The server's key is unknown, or no fingerprint is stored: nothing is
//   deleted. A wrong wrap key then refuses the open and keeps `key.bin`,
// as before.
// - After a valid open, the fingerprint of the server's key is stored. An
//   index opened while the server's key was unknown gets its fingerprint here.
// A page cannot use this to delete an index: the server, not the page,
// names the key, and the bridge wipe already lets a confirmed page delete
// the index of its own user.
export const loadOwnedIndexKey = async ({
  dir,
  ownerKey,
  loadKey,
  host,
  onOwnerKeyChanged,
}: LoadOwnedIndexKeyOptions): Promise<IndexKey> => {
  const stored = await readStoredFingerprint(dir);
  if (ownerKey !== undefined && stored !== undefined && stored !== ownerKey) {
    // Discard first, so no pending or running save writes the old index
    // again after the delete.
    if (host.indexIds().includes(dir)) await host.discard(dir);
    await rm(dir, { recursive: true, force: true });
    onOwnerKeyChanged?.();
  }

  const indexKey = await loadKey();
  // A memory-only index writes nothing to disk.
  if (indexKey.persistent && typeof ownerKey === 'string') {
    if (stored !== ownerKey) await writeStoredFingerprint(dir, ownerKey);
  }
  return indexKey;
};
