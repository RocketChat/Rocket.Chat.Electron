import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchHost } from '../host';
import type { SearchHost, WorkerTransport } from '../host';
import { INDEX_DB_FILE_NAME } from '../indexFiles';
import { createE2EESearchIpcHandler, E2EE_SEARCH_LOCKED_RESULT } from '../ipc';
import type { E2EESearchSender } from '../ipc';
import {
  createKeyStore,
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  KEY_FILE_NAME,
} from '../keyStore';
import type { E2EESearchDoc, E2EESearchHit } from '../types';
import { createWorkerHandler } from '../workerHandler';
import type { WorkerResponse } from '../workerProtocol';

// LSE2EE-110: the bridge, the key store and the worker together. On a server
// that has E2EE, nothing reaches the disk before the wrap key, and the key
// file on the disk is sealed by the wrap key.

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const NEEDLE = 'zanzibarquokka';
const SERVER = 'https://a.example.com/';
const USER = 'user1';

const spawn = (): WorkerTransport => {
  const handler = createWorkerHandler({ DatabaseSync });
  const listeners: Array<(response: WorkerResponse) => void> = [];
  return {
    postMessage: (request) => {
      void handler
        .handle(request)
        .then((response) =>
          listeners.forEach((listener) => listener(response))
        );
    },
    onMessage: (listener) => listeners.push(listener),
    onExit: () => undefined,
    kill: () => undefined,
  };
};

// A reversible stand-in for the OS keychain, as in keyStore.main.spec.ts.
const safeStorage = {
  isAsyncEncryptionAvailable: async () => true,
  getSelectedStorageBackend: () => 'gnome_libsecret' as const,
  encryptStringAsync: async (plain: string) =>
    Buffer.from(`wrapped:${Buffer.from(plain).toString('hex')}`),
  decryptStringAsync: async (encrypted: Buffer) => {
    const text = encrypted.toString();
    if (!text.startsWith('wrapped:')) throw new Error('Error while decrypting');
    return {
      result: Buffer.from(text.slice('wrapped:'.length), 'hex').toString(),
      shouldReEncrypt: false,
    };
  },
};

const doc = (id: string, body: string): E2EESearchDoc => ({
  id,
  rid: 'r1',
  uid: 'u1',
  username: 'ana',
  ts: 1000,
  updatedAt: 1000,
  kind: 'text',
  body,
});

const createSender = (id: number) => {
  const navigated: Array<() => void> = [];
  const sender: E2EESearchSender & { navigate(): void } = {
    id,
    once: () => undefined,
    on: (_event, listener) => navigated.push(listener),
    navigate: () => navigated.forEach((listener) => listener()),
  };
  return sender;
};

describe('E2EE search index sealing (LSE2EE-110)', () => {
  let root: string;
  let dir: string;
  let host: SearchHost;
  let closes: Promise<void>[];
  let handle: ReturnType<typeof createE2EESearchIpcHandler>;
  const webview = createSender(11);

  const keyStore = () => createKeyStore({ dir, safeStorage });
  const wrapKeyOf = (byte: number) => new Uint8Array(32).fill(byte);
  const keyFile = () => path.join(dir, KEY_FILE_NAME);

  // Ends the document, and waits until its index is saved and closed.
  const reload = async () => {
    webview.navigate();
    await Promise.all(closes);
  };

  const search = async () =>
    (
      (await handle({ sender: webview }, 'search', {
        text: NEEDLE,
      })) as E2EESearchHit[]
    ).map((hit) => hit.id);

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-seal-'));
    dir = path.join(root, USER);
    host = createSearchHost({ spawn });
    closes = [];
    handle = createE2EESearchIpcHandler({
      resolveServerUrl: () => SERVER,
      verifyUserId: async () => true,
      fetchOwnerKey: async () => undefined,
      openIndex: async (_serverUrl, userId, wrapKey) => {
        const indexKey = await keyStore()
          .load({ wrapKey })
          .finally(() => wrapKey?.fill(0));
        const result = await host.open(dir, { userId, dir, indexKey });
        return { indexId: dir, result: result as any };
      },
      call: (indexId, method, ...args) => host.call(indexId, method, ...args),
      close: (indexId) => {
        const closing = host.close(indexId);
        closes.push(closing);
        return closing;
      },
      wipeIndex: async (indexId) => {
        await host.discard(indexId);
        rmSync(indexId, { recursive: true, force: true });
      },
      userIndexId: () => dir,
      logError: () => undefined,
      logNotOpen: () => undefined,
      logOwnerKeyError: () => undefined,
    });
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  it('writes nothing before the wrap key, and seals the key file after it', async () => {
    await expect(
      handle({ sender: webview }, 'open', {
        userId: USER,
        e2eeAvailable: true,
      })
    ).resolves.toEqual(E2EE_SEARCH_LOCKED_RESULT);
    expect(existsSync(keyFile())).toBe(false);
    expect(existsSync(path.join(dir, INDEX_DB_FILE_NAME))).toBe(false);

    await handle({ sender: webview }, 'open', {
      userId: USER,
      wrapKey: wrapKeyOf(1),
      e2eeAvailable: true,
    });
    await handle({ sender: webview }, 'upsert', [doc('m1', NEEDLE)]);
    await expect(search()).resolves.toEqual(['m1']);
    await expect(keyStore().isSealed()).resolves.toBe(true);
  });

  it('seals a key file that is not sealed at the next open with the wrap key, and keeps its index', async () => {
    // An index from before LSE2EE-110, opened with no wrap key.
    await handle({ sender: webview }, 'open', { userId: USER });
    await handle({ sender: webview }, 'upsert', [doc('m1', NEEDLE)]);
    await reload();
    await expect(keyStore().isSealed()).resolves.toBe(false);
    const plainKeyFile = readFileSync(keyFile());

    // E2EE locked: the old key file stays as it is, and the index stays shut.
    await expect(
      handle({ sender: webview }, 'open', {
        userId: USER,
        e2eeAvailable: true,
      })
    ).resolves.toEqual(E2EE_SEARCH_LOCKED_RESULT);
    expect(readFileSync(keyFile())).toEqual(plainKeyFile);

    await handle({ sender: webview }, 'open', {
      userId: USER,
      wrapKey: wrapKeyOf(1),
      e2eeAvailable: true,
    });
    await expect(keyStore().isSealed()).resolves.toBe(true);
    await expect(search()).resolves.toEqual(['m1']);
  });

  it('refuses another wrap key for a sealed key file and keeps the file', async () => {
    await handle({ sender: webview }, 'open', {
      userId: USER,
      wrapKey: wrapKeyOf(1),
      e2eeAvailable: true,
    });
    await handle({ sender: webview }, 'upsert', [doc('m1', NEEDLE)]);
    await reload();
    const sealedKeyFile = readFileSync(keyFile());

    await expect(
      handle({ sender: webview }, 'open', {
        userId: USER,
        wrapKey: wrapKeyOf(2),
        e2eeAvailable: true,
      })
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    expect(readFileSync(keyFile())).toEqual(sealedKeyFile);

    // A page that leaves the flag out gets no unsealed index either.
    await expect(
      handle({ sender: webview }, 'open', { userId: USER })
    ).rejects.toMatchObject({ name: E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME });
    expect(readFileSync(keyFile())).toEqual(sealedKeyFile);

    await handle({ sender: webview }, 'open', {
      userId: USER,
      wrapKey: wrapKeyOf(1),
      e2eeAvailable: true,
    });
    await expect(search()).resolves.toEqual(['m1']);
  });
});
