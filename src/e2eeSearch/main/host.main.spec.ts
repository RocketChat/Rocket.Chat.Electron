import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createSearchHost,
  disposeBeforeQuit,
  SAVE_DELAY_MS,
  WorkerExitedError,
} from '../host';
import type { SearchHost, WorkerTransport } from '../host';
import { SNAPSHOT_FILE_NAME } from '../snapshotStore';
import type { E2EESearchDoc, E2EESearchHit } from '../types';
import type {
  WorkerOpenArgs,
  WorkerRequest,
  WorkerResponse,
} from '../workerProtocol';
import { createFakeWorkers } from './fakeWorkers';

const NEEDLE = 'zanzibarquokka';

const docs = (count: number): E2EESearchDoc[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    rid: 'r1',
    uid: 'u1',
    username: 'ana',
    ts: 1000 + i,
    updatedAt: 1000 + i,
    kind: 'text' as const,
    body: i === 42 ? `the ${NEEDLE} hides here` : `ordinary message ${i}`,
  }));

const searchIds = async (host: SearchHost, indexId: string) =>
  (
    (await host.call(indexId, 'search', { text: NEEDLE })) as E2EESearchHit[]
  ).map((hit) => hit.id);

describe('E2EE search host', () => {
  let dir: string;
  let openArgs: WorkerOpenArgs;
  const indexId = 'server-a/user-1';

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'e2ee-host-'));
    openArgs = {
      userId: 'user-1',
      dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  });

  it('opens, upserts 100 docs and finds the needle', async () => {
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });

    await expect(host.open(indexId, openArgs)).resolves.toEqual({
      schemaVersion: expect.any(Number),
      encryptedAtRest: true,
      store: 'snapshot',
    });
    await host.call(indexId, 'upsert', docs(100));

    expect(await searchIds(host, indexId)).toEqual(['m42']);
    expect(workers.spawned).toHaveLength(1);
    await host.dispose();
  });

  it.each([
    ['persistent', true],
    ['memory-only', false],
  ])(
    'a second open of a %s index keeps the docs that are not saved yet',
    async (_label, persistent) => {
      const workers = createFakeWorkers();
      const host = createSearchHost({ spawn: workers.spawn });
      const args: WorkerOpenArgs = persistent
        ? openArgs
        : {
            ...openArgs,
            indexKey: {
              persistent: false,
              key: randomBytes(32),
              reason: 'no-encryption',
            },
          };
      await host.open(indexId, args);
      await host.call(indexId, 'upsert', docs(100));

      // A page reload or a second webview of the same server opens again.
      await host.open(indexId, args);

      expect(await searchIds(host, indexId)).toEqual(['m42']);
      await host.dispose();
    }
  );

  it('restarts the worker after a crash and the next call succeeds', async () => {
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });
    await host.open(indexId, openArgs);
    await host.call(indexId, 'upsert', docs(100));
    await host.flush();

    workers.setStall(true);
    const inFlight = host.call(indexId, 'stats');
    workers.spawned[0].crash();
    await expect(inFlight).rejects.toBeInstanceOf(WorkerExitedError);

    workers.setStall(false);
    expect(await searchIds(host, indexId)).toEqual(['m42']);
    expect(workers.spawned).toHaveLength(2);
    await host.dispose();
  });

  it('saves 30 s after the last change, not before', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });
    await host.open(indexId, openArgs);
    const saves = () => workers.methods.filter((m) => m === 'save').length;

    await host.call(indexId, 'upsert', docs(10));
    await jest.advanceTimersByTimeAsync(SAVE_DELAY_MS - 1);
    await host.call(indexId, 'remove', ['m1']);
    await jest.advanceTimersByTimeAsync(SAVE_DELAY_MS - 1);
    expect(saves()).toBe(0);
    expect(host.hasUnsavedChanges()).toBe(true);

    await jest.advanceTimersByTimeAsync(1);
    expect(saves()).toBe(1);
    // A save that runs is not on disk yet.
    await host.flush();
    expect(saves()).toBe(1);
    expect(host.hasUnsavedChanges()).toBe(false);

    await host.call(indexId, 'search', { text: NEEDLE });
    await jest.advanceTimersByTimeAsync(SAVE_DELAY_MS * 2);
    expect(saves()).toBe(1);
    await host.dispose();
  });

  it('saves at most 60 s after the first change while changes keep coming', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const workers = createFakeWorkers();
    const start = Date.now();
    const saveTimes: number[] = [];
    let inFlight = 0;
    // Records when each save starts, and counts the requests that the worker
    // has not answered yet. The snapshot write is real I/O, so the fake clock
    // must not move while a request is in flight.
    const spawn = () => {
      const transport = workers.spawn();
      return {
        ...transport,
        postMessage: (request: Parameters<typeof transport.postMessage>[0]) => {
          inFlight++;
          if (request.method === 'save') saveTimes.push(Date.now() - start);
          transport.postMessage(request);
        },
        onMessage: (
          listener: Parameters<typeof transport.onMessage>[0]
        ): void =>
          transport.onMessage((response) => {
            inFlight--;
            listener(response);
          }),
      };
    };
    const host = createSearchHost({ spawn });
    await host.open(indexId, openArgs);
    const recordSaves = async () => {
      for (let i = 0; i < 1_000 && inFlight > 0; i++) {
        // eslint-disable-next-line no-await-in-loop -- waits for real I/O
        await new Promise((resolve) => setImmediate(resolve));
      }
    };

    // A backfill or a busy room: one upsert every 5 s for 5 minutes.
    for (let t = 0; t < 300_000; t += 5_000) {
      // eslint-disable-next-line no-await-in-loop -- the changes arrive in time order
      await host.call(indexId, 'upsert', docs(1));
      for (let step = 0; step < 5; step++) {
        // eslint-disable-next-line no-await-in-loop -- the clock moves in time order
        await jest.advanceTimersByTimeAsync(1_000);
        // eslint-disable-next-line no-await-in-loop -- waits for real I/O
        await recordSaves();
      }
    }
    await jest.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    await recordSaves();

    expect(saveTimes[0]).toBeLessThanOrEqual(60_000);
    expect(saveTimes.length).toBeGreaterThanOrEqual(5);
    // Each save starts at most 60 s after the save before it.
    saveTimes.slice(1).forEach((time, i) => {
      expect(time - saveTimes[i]).toBeLessThanOrEqual(60_000);
    });
    expect(host.hasUnsavedChanges()).toBe(false);
    await host.dispose();
  });

  it('runs one save of an index at a time', async () => {
    const workers = createFakeWorkers();
    const held: Array<() => void> = [];
    let running = 0;
    let maxRunning = 0;
    // Holds each save response until the spec releases it.
    const spawn = () => {
      const transport = workers.spawn();
      const saveIds = new Set<number>();
      return {
        ...transport,
        postMessage: (request: Parameters<typeof transport.postMessage>[0]) => {
          if (request.method === 'save') {
            saveIds.add(request.id);
            running++;
            maxRunning = Math.max(maxRunning, running);
          }
          transport.postMessage(request);
        },
        onMessage: (
          listener: Parameters<typeof transport.onMessage>[0]
        ): void =>
          transport.onMessage((response) => {
            if (!saveIds.delete(response.id)) {
              listener(response);
              return;
            }
            held.push(() => {
              running--;
              listener(response);
            });
          }),
      };
    };
    const host = createSearchHost({ spawn });
    await host.open(indexId, openArgs);

    await host.call(indexId, 'upsert', docs(10));
    const first = host.flush();
    await new Promise((resolve) => setImmediate(resolve));
    await host.call(indexId, 'remove', ['m1']);
    const second = host.flush();
    let settled = false;
    const both = Promise.all([first, second]).then(() => {
      settled = true;
    });
    for (let i = 0; i < 400 && !settled; i++) {
      while (held.length) held.shift()?.();
      // eslint-disable-next-line no-await-in-loop -- releases each held save in turn
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await both;

    expect(maxRunning).toBe(1);
    expect(workers.methods.filter((m) => m === 'save')).toHaveLength(2);
    expect(host.hasUnsavedChanges()).toBe(false);
    await host.dispose();
  });

  // A webview reload closes the old document's session and the new page
  // opens the same index at once, while the close still saves.
  it('an open during a close keeps the index open for the new session', async () => {
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });
    await host.open(indexId, openArgs);
    await host.call(indexId, 'upsert', docs(100));

    const closing = host.close(indexId);
    await host.open(indexId, openArgs);
    await closing;
    await host.call(indexId, 'upsert', [
      { ...docs(1)[0], id: 'n1', ts: 5000, body: 'the needle after reload' },
    ]);
    const after = (await host.call(indexId, 'search', {
      text: 'needle',
    })) as E2EESearchHit[];
    expect(after.map((hit) => hit.id)).toEqual(['n1']);

    await host.close(indexId);
    await host.open(indexId, openArgs);
    expect(await searchIds(host, indexId)).toEqual(['m42']);
    expect(((await host.call(indexId, 'stats')) as { docs: number }).docs).toBe(
      101
    );
    await host.dispose();
  });

  it('a change that lands while the close saves reaches the snapshot', async () => {
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });
    await host.open(indexId, openArgs);
    await host.call(indexId, 'upsert', docs(100));

    const closing = host.close(indexId);
    // A call of the old document that was already in flight.
    const late = host.call(indexId, 'upsert', [
      { ...docs(1)[0], id: 'late', ts: 6000, body: 'the late needle' },
    ]);
    await Promise.allSettled([closing, late]);

    await host.open(indexId, openArgs);
    expect(
      (
        (await host.call(indexId, 'search', {
          text: 'late',
        })) as E2EESearchHit[]
      ).map((hit) => hit.id)
    ).toEqual(['late']);
    expect(((await host.call(indexId, 'stats')) as { docs: number }).docs).toBe(
      101
    );
    await host.dispose();
  });

  it('flushes unsaved changes before quit, encrypted, and a new worker reads them', async () => {
    const workers = createFakeWorkers();
    const host = createSearchHost({ spawn: workers.spawn });
    await host.open(indexId, openArgs);
    await host.call(indexId, 'upsert', docs(100));
    expect(host.hasUnsavedChanges()).toBe(true);

    await host.dispose();

    const file = path.join(dir, SNAPSHOT_FILE_NAME);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).includes(NEEDLE)).toBe(false);
    expect(workers.spawned[0].killed).toBe(true);

    const next = createSearchHost({ spawn: workers.spawn });
    await next.open(indexId, openArgs);
    expect(await searchIds(next, indexId)).toEqual(['m42']);
    await next.dispose();
  });

  // A quit closes the windows before will-quit, and the end of
  // each webview closes its index, which starts the save. The quit must
  // still wait for that save before it stops the worker.
  it('waits on quit for a save that a closing webview started', async () => {
    const workers = createFakeWorkers();
    const heldSaves: Array<() => void> = [];
    let savesHeldAtKill: number | undefined;
    const spawn = (): WorkerTransport => {
      const transport = workers.spawn();
      return {
        ...transport,
        postMessage: (request) => {
          if (request.method === 'save') {
            heldSaves.push(() => transport.postMessage(request));
            return;
          }
          transport.postMessage(request);
        },
        kill: () => {
          savesHeldAtKill = heldSaves.length;
          transport.kill();
        },
      };
    };
    const onSaveError = jest.fn();
    const host = createSearchHost({ spawn, onSaveError });
    await host.open(indexId, openArgs);
    await host.call(indexId, 'upsert', docs(100));

    const closing = host.close(indexId).catch(() => undefined);
    for (let i = 0; i < 100 && heldSaves.length === 0; i++) {
      // eslint-disable-next-line no-await-in-loop -- waits until the close posts its save
      await new Promise((resolve) => setImmediate(resolve));
    }
    expect(heldSaves).toHaveLength(1);
    expect(host.hasUnsavedChanges()).toBe(true);

    const disposing = host.dispose();
    await new Promise((resolve) => setImmediate(resolve));
    heldSaves.shift()?.();
    await disposing;
    await closing;

    expect(savesHeldAtKill).toBe(0);
    expect(onSaveError).not.toHaveBeenCalled();
    const next = createSearchHost({ spawn: workers.spawn });
    await next.open(indexId, openArgs);
    expect(await searchIds(next, indexId)).toEqual(['m42']);
    await next.dispose();
  });

  describe('worker time across servers', () => {
    // A worker stand-in that answers only when the spec says so, so the spec
    // sees the order in which the host posts the calls.
    const createManualWorkers = () => {
      const posted: WorkerRequest[] = [];
      const answered = new Set<number>();
      const messageListeners: Array<(response: WorkerResponse) => void> = [];
      const exitListeners: Array<(code: number) => void> = [];
      const spawn = (): WorkerTransport => ({
        postMessage: (request) => posted.push(request),
        onMessage: (listener) => messageListeners.push(listener),
        onExit: (listener) => exitListeners.push(listener),
        kill: () => undefined,
      });
      const answerNext = async () => {
        const request = posted.find((r) => !answered.has(r.id));
        if (!request) throw new Error('no call waits for an answer');
        answered.add(request.id);
        messageListeners.forEach((listener) =>
          listener({ id: request.id, ok: true, value: request.method })
        );
        await new Promise((resolve) => setImmediate(resolve));
      };
      const crash = () => {
        posted.forEach((r) => answered.add(r.id));
        exitListeners.splice(0).forEach((listener) => listener(1));
        messageListeners.splice(0);
      };
      const waiting = () => posted.filter((r) => !answered.has(r.id)).length;
      return { spawn, posted, answerNext, crash, waiting };
    };

    const serverA = 'server-a/user-1';
    const serverB = 'server-b/user-1';

    it('a search from server B waits for at most 1 call of server A', async () => {
      const workers = createManualWorkers();
      const host = createSearchHost({ spawn: workers.spawn });

      const callsOfA = Array.from({ length: 32 }, (_, i) =>
        host.call(serverA, 'stats', i)
      );
      const searchOfB = host.call(serverB, 'search', { text: NEEDLE });

      const indexOfB = () =>
        workers.posted.findIndex((r) => r.indexId === serverB);
      for (let i = 0; i < 40 && indexOfB() === -1; i++) {
        // eslint-disable-next-line no-await-in-loop -- answers one call at a time
        await workers.answerNext();
      }

      const callsOfABeforeB = workers.posted
        .slice(0, indexOfB())
        .filter((r) => r.indexId === serverA).length;
      expect(callsOfABeforeB).toBeLessThanOrEqual(1);

      while (workers.waiting() > 0) {
        // eslint-disable-next-line no-await-in-loop -- answers the rest in order
        await workers.answerNext();
      }
      await expect(searchOfB).resolves.toBe('search');
      await expect(Promise.all(callsOfA)).resolves.toHaveLength(32);
      // Each server's own calls keep their order.
      expect(
        workers.posted
          .filter((r) => r.indexId === serverA)
          .map((r) => r.args[0])
      ).toEqual(Array.from({ length: 32 }, (_, i) => i));
    });

    it('a crash rejects the calls that wait in the host queue', async () => {
      const workers = createManualWorkers();
      const host = createSearchHost({ spawn: workers.spawn });

      const first = host.call(serverA, 'stats');
      const queuedA = host.call(serverA, 'stats');
      const queuedB = host.call(serverB, 'stats');
      workers.crash();

      await expect(first).rejects.toBeInstanceOf(WorkerExitedError);
      await expect(queuedA).rejects.toBeInstanceOf(WorkerExitedError);
      await expect(queuedB).rejects.toBeInstanceOf(WorkerExitedError);

      const next = host.call(serverB, 'stats');
      await workers.answerNext();
      await expect(next).resolves.toBe('stats');
    });
  });
});

// A quit waits for the last save only up to a limit. When the limit ends the
// wait first, the save is lost, and the caller must hear about it.
describe('disposeBeforeQuit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports a timeout when the save does not end within the limit', async () => {
    const onTimeout = jest.fn();
    const done = jest.fn();
    void disposeBeforeQuit(
      { dispose: () => new Promise<void>(() => undefined) },
      5_000,
      onTimeout
    ).then(done);

    await jest.advanceTimersByTimeAsync(4_999);
    expect(done).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('reports no timeout when the save ends within the limit', async () => {
    const onTimeout = jest.fn();
    await disposeBeforeQuit(
      { dispose: () => Promise.resolve() },
      5_000,
      onTimeout
    );

    await jest.advanceTimersByTimeAsync(10_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
