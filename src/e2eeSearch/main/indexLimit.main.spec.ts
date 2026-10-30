import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchHost } from '../host';
import { indexLimitOf, limitedReasonOf } from '../indexLimit';
import type { IndexKey } from '../keyStore';
import { collectIndexStats } from '../lifecycle';
import type { WorkerOpenResult } from '../workerProtocol';
import { createFakeWorkers } from './fakeWorkers';

const persistent: IndexKey = {
  persistent: true,
  key: Buffer.alloc(32),
  reset: false,
};
const memoryOnly = (
  reason: Extract<IndexKey, { persistent: false }>['reason']
): IndexKey => ({ persistent: false, key: Buffer.alloc(32), reason });

describe('indexLimitOf', () => {
  it('has no reason for a persistent key on the file store', () => {
    expect(
      indexLimitOf(persistent, { store: 'file', encryptedAtRest: true })
    ).toEqual({
      store: 'file',
    });
  });

  it.each([
    'no-encryption',
    'basic-text-backend',
    'keychain-timeout',
    'hard-coded-wrap',
  ] as const)('carries the %s reason of a memory-only key', (reason) => {
    expect(
      indexLimitOf(memoryOnly(reason), {
        store: 'snapshot',
        encryptedAtRest: false,
      })
    ).toEqual({
      store: 'snapshot',
      reason,
    });
  });

  it('reports the native module when the file store did not open', () => {
    expect(
      indexLimitOf(persistent, {
        store: 'snapshot',
        encryptedAtRest: true,
        fileStoreError: { name: 'Error', code: 'ERR_DLOPEN_FAILED' },
      })
    ).toEqual({ store: 'snapshot', reason: 'native-module-unavailable' });
  });

  it('keeps the key reason when both limits apply', () => {
    expect(
      indexLimitOf(memoryOnly('basic-text-backend'), {
        store: 'snapshot',
        encryptedAtRest: false,
        fileStoreError: { name: 'Error' },
      }).reason
    ).toBe('basic-text-backend');
  });

  it('keeps the reason of a memory-only index that a persistent key opens again', () => {
    const opened = indexLimitOf(memoryOnly('keychain-timeout'), {
      store: 'snapshot',
      encryptedAtRest: false,
    });
    expect(
      indexLimitOf(
        persistent,
        { store: 'snapshot', encryptedAtRest: false },
        opened
      )
    ).toEqual({ store: 'snapshot', reason: 'keychain-timeout' });
  });

  it('keeps the full limit of a file index that a memory-only key opens again', () => {
    const opened = indexLimitOf(persistent, {
      store: 'file',
      encryptedAtRest: true,
    });
    expect(
      indexLimitOf(
        memoryOnly('keychain-timeout'),
        { store: 'file', encryptedAtRest: true },
        opened
      )
    ).toEqual({ store: 'file' });
  });

  it('computes a new limit when the index was made with this key', () => {
    expect(
      indexLimitOf(
        persistent,
        { store: 'file', encryptedAtRest: true },
        { store: 'snapshot', reason: 'keychain-timeout' }
      )
    ).toEqual({ store: 'file' });
  });
});

describe('limitedReasonOf', () => {
  it('returns the first reason of the users of a server', () => {
    expect(
      limitedReasonOf([
        { store: 'file' },
        { store: 'snapshot', reason: 'keychain-timeout' },
      ])
    ).toBe('keychain-timeout');
    expect(limitedReasonOf([{ store: 'file' }])).toBeUndefined();
  });
});

describe('index stats carry the limit', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-limit-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('keeps the keychain-timeout reason when a persistent key reuses the open memory-only index', async () => {
    const host = createSearchHost({ spawn: createFakeWorkers().spawn });
    const indexId = path.join(root, 'server', 'user-1');
    const openWith = (indexKey: IndexKey) =>
      host.open(indexId, {
        userId: 'user-1',
        dir: indexId,
        indexKey,
      }) as Promise<WorkerOpenResult>;
    const first = await openWith(memoryOnly('keychain-timeout'));
    const firstLimit = indexLimitOf(memoryOnly('keychain-timeout'), first);
    const reused = await openWith(persistent);
    expect(reused.encryptedAtRest).toBe(false);
    expect(indexLimitOf(persistent, reused, firstLimit)).toEqual({
      store: 'snapshot',
      reason: 'keychain-timeout',
    });
    await host.dispose();
  });

  it('adds the store and the reason of an open limited index', async () => {
    const host = createSearchHost({ spawn: createFakeWorkers().spawn });
    const url = 'https://chat.example.com';
    const { serverDirName } = await import('../lifecycle');
    const indexId = path.join(root, serverDirName(url), 'user-1');
    await host.open(indexId, {
      userId: 'user-1',
      dir: indexId,
      indexKey: memoryOnly('basic-text-backend'),
    });
    const stats = await collectIndexStats({
      host,
      rootDir: root,
      serverUrls: [url],
      isEncryptedAtRest: () => false,
      limitOf: () => ({ store: 'snapshot', reason: 'basic-text-backend' }),
    });
    expect(stats[0]).toMatchObject({
      serverUrl: url,
      store: 'snapshot',
      limitedReason: 'basic-text-backend',
    });
    await host.dispose();
  });
});
