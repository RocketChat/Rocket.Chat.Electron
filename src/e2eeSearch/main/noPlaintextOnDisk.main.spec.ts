import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { decryptSnapshot, SNAPSHOT_FILE_NAME } from '../snapshotStore';
import type { E2EESearchDoc, E2EESearchHit } from '../types';
import { createWorkerHandler } from '../workerHandler';
import type { WorkerOpenArgs, WorkerRequest } from '../workerProtocol';
import { findCanaryInBuffer, scanDirForCanary } from './canaryScan';

// The rule "no plaintext-derived data on disk", as a check. The spec indexes
// messages that hold random canaries through the real worker path (the
// in-memory SQLite FTS5 engine and the AES-256-GCM snapshot), lets the
// worker write everything it writes, and then scans every file in the
// profile folder for the canaries. The same scanner runs on a live profile:
// scripts/e2ee-search-canary-scan.mjs.

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const canary = (prefix: string) =>
  `${prefix}${randomBytes(12).toString('hex')}`;

const doc = (
  overrides: Partial<E2EESearchDoc> & Pick<E2EESearchDoc, 'id' | 'body'>
): E2EESearchDoc => ({
  rid: 'room1',
  uid: 'u1',
  username: 'ana',
  ts: 1000,
  updatedAt: 1000,
  kind: 'text',
  ...overrides,
});

describe('E2EE search: no plaintext-derived data on disk', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-canary-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // Positive control: without it, a scanner that finds nothing would pass
  // the leak check below.
  it('finds a planted canary as UTF-8 and UTF-16LE, across chunk edges, and follows no symlink', async () => {
    const token = canary('cnry');
    const profile = path.join(root, 'profile');
    mkdirSync(path.join(profile, 'nested'), { recursive: true });

    const utf8Prefix = 'message: ';
    writeFileSync(
      path.join(profile, 'utf8.txt'),
      `${utf8Prefix}${token.toUpperCase()} end`
    );
    const utf16Prefix = Buffer.from([0xff, 0xfe, 0x00]);
    writeFileSync(
      path.join(profile, 'nested', 'utf16.bin'),
      Buffer.concat([utf16Prefix, Buffer.from(`${token} end`, 'utf16le')])
    );
    // With 64-byte chunks, both copies cross the edge at offset 64.
    const chunkBytes = 64;
    const edge = Buffer.alloc(3 * chunkBytes, 0x2e);
    edge.write(token, chunkBytes - 10, 'utf8');
    edge.write(token, 2 * chunkBytes - 20, 'utf16le');
    writeFileSync(path.join(profile, 'edge.bin'), edge);
    writeFileSync(path.join(profile, 'clean.txt'), 'nothing to see');

    // A directory link to a folder with the canary. A junction needs no
    // admin rights on Windows, and other platforms ignore the type.
    const outside = path.join(root, 'outside');
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'leak.txt'), token);
    symlinkSync(outside, path.join(profile, 'link'), 'junction');

    const result = await scanDirForCanary(profile, token, { chunkBytes });

    const byPath = (a: { path: string }, b: { path: string }) =>
      a.path.localeCompare(b.path);
    expect([...result.hits].sort(byPath)).toEqual(
      [
        {
          path: path.join(profile, 'edge.bin'),
          offset: chunkBytes - 10,
          encoding: 'utf8',
        },
        {
          path: path.join(profile, 'edge.bin'),
          offset: 2 * chunkBytes - 20,
          encoding: 'utf16le',
        },
        {
          path: path.join(profile, 'nested', 'utf16.bin'),
          offset: utf16Prefix.length,
          encoding: 'utf16le',
        },
        {
          path: path.join(profile, 'utf8.txt'),
          offset: utf8Prefix.length,
          encoding: 'utf8',
        },
      ].sort(byPath)
    );
    expect(result.filesScanned).toBe(4);
    expect(result.skipped).toEqual([
      { path: path.join(profile, 'link'), reason: 'symlink' },
    ]);
  });

  it('writes no canary from indexed messages to the profile folder', async () => {
    const word = canary('cnryword');
    const phraseWords = [canary('cnryphrasea'), canary('cnryphraseb')];
    const phrase = phraseWords.join(' ');
    const sender = canary('cnryuser');
    const tokens = [word, ...phraseWords, phrase, sender];

    const profile = path.join(root, 'profile');
    const indexDir = path.join(profile, 'e2ee-search', 'server', 'user');
    const key = randomBytes(32);
    const openArgs: WorkerOpenArgs = {
      userId: 'me',
      dir: indexDir,
      indexKey: { persistent: true, key, reset: false },
    };

    let nextId = 0;
    const call = async (
      handler: ReturnType<typeof createWorkerHandler>,
      method: WorkerRequest['method'],
      args: unknown[] = []
    ) => {
      nextId += 1;
      const response = await handler.handle({
        id: nextId,
        indexId: indexDir,
        method,
        args,
      });
      if (!response.ok) {
        throw new Error(`${method}: ${response.error.message}`);
      }
      return response.value;
    };
    const searchIds = async (
      handler: ReturnType<typeof createWorkerHandler>,
      text: string
    ) =>
      ((await call(handler, 'search', [{ text }])) as E2EESearchHit[]).map(
        (hit) => hit.id
      );

    const writer = createWorkerHandler({ DatabaseSync });
    expect(await call(writer, 'open', [openArgs])).toMatchObject({
      encryptedAtRest: true,
    });
    await call(writer, 'upsert', [
      [
        doc({ id: 'word', body: `orçamento ${word} amanhã` }),
        doc({ id: 'phrase', body: `the ${phrase} message`, ts: 2000 }),
        doc({
          id: 'sender',
          body: 'reunião de equipe',
          username: sender,
          ts: 3000,
        }),
      ],
    ]);
    await call(writer, 'setRoomState', [
      'room1',
      { lastUpdate: 3000, backfillDone: true },
    ]);
    expect(await searchIds(writer, word)).toEqual(['word']);
    expect(await searchIds(writer, phrase)).toEqual(['phrase']);
    // `save` writes the snapshot and `close` drops the database, so every
    // file that this path writes is on disk now.
    await call(writer, 'save');
    await call(writer, 'close');

    const snapshotFile = path.join(indexDir, SNAPSHOT_FILE_NAME);
    expect(existsSync(snapshotFile)).toBe(true);
    expect(statSync(snapshotFile).size).toBeGreaterThan(0);

    // The snapshot holds every canary. Only the encryption hides them, so a
    // clean scan below is about the encryption, not about an empty file.
    const plain = decryptSnapshot(readFileSync(snapshotFile), key);
    for (const token of tokens) {
      expect(findCanaryInBuffer(plain, token).length).toBeGreaterThan(0);
    }

    const scanAll = async () => {
      for (const token of tokens) {
        // eslint-disable-next-line no-await-in-loop -- scans share the disk, one at a time is enough
        const result = await scanDirForCanary(profile, token);
        expect({ token, hits: result.hits, skipped: result.skipped }).toEqual({
          token,
          hits: [],
          skipped: [],
        });
        expect(result.filesScanned).toBeGreaterThan(0);
      }
    };
    await scanAll();

    // Find after restart: the index comes back from the encrypted file only.
    const reader = createWorkerHandler({ DatabaseSync });
    await call(reader, 'open', [openArgs]);
    expect(await searchIds(reader, word)).toEqual(['word']);
    await call(reader, 'close');
    await scanAll();
  });
});
