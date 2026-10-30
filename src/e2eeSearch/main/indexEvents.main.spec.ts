import { createSearchHost } from '../host';
import { createE2EESearchIpcHandler } from '../ipc';
import type { WorkerResponse } from '../workerProtocol';
import { createFakeWorkers } from './fakeWorkers';

const { randomBytes } = process.getBuiltinModule('node:crypto');
const { mkdtempSync, rmSync } = process.getBuiltinModule('node:fs');
const { tmpdir } = process.getBuiltinModule('node:os');
const path = process.getBuiltinModule('node:path');

it('reports worker loss and resets saved crawler checkpoints before recovery', async () => {
  const workers = createFakeWorkers();
  const host = createSearchHost({ spawn: workers.spawn });
  const root = mkdtempSync(path.join(tmpdir(), 'search-events-'));
  const received = jest.fn();
  try {
    await host.open(root, {
      userId: 'user',
      dir: root,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    });
    host.onIndexEvent(root, received);
    await host.call(root, 'setRoomState', 'room', { backfillDone: true });
    await host.flush();
    workers.spawned[0].crash();
    expect(received).toHaveBeenCalledWith({ type: 'lost' });
    const resets = workers.methods.filter(
      (method) => method === 'resetCheckpoints'
    ).length;
    await Promise.all([
      host.call(root, 'setRoomState', 'new-room', { backfillDone: true }),
      host.call(root, 'stats'),
    ]);
    expect(await host.call(root, 'getRoomState', 'room')).toBeUndefined();
    expect(await host.call(root, 'getRoomState', 'new-room')).toMatchObject({
      backfillDone: true,
    });
    expect(
      workers.methods.filter((method) => method === 'resetCheckpoints')
    ).toHaveLength(resets + 1);
  } finally {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  }
});

it('clears an active index and its checkpoints without revoking recovery access', async () => {
  const workers = createFakeWorkers();
  const host = createSearchHost({ spawn: workers.spawn });
  const root = mkdtempSync(path.join(tmpdir(), 'search-events-'));
  const received = jest.fn();
  try {
    await host.open(root, {
      userId: 'user',
      dir: root,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    });
    const doc = {
      id: 'before-clear',
      rid: 'room',
      uid: 'user',
      username: 'user',
      ts: 1,
      updatedAt: 1,
      kind: 'text',
      body: 'needle',
    };
    await host.call(root, 'upsert', [doc]);
    await host.call(root, 'setRoomState', 'room', { backfillDone: true });
    host.onIndexEvent(root, received);
    await host.clear(root);
    expect(
      received.mock.calls.filter(([event]) => event.type === 'lost')
    ).toEqual([[{ type: 'lost' }]]);
    expect(await host.call(root, 'search', { text: 'needle' })).toEqual([]);
    expect(await host.call(root, 'stats')).toMatchObject({ docs: 0, rooms: 0 });
    expect(await host.call(root, 'getRoomState', 'room')).toBeUndefined();
    await host.call(root, 'upsert', [{ ...doc, id: 'after-clear' }]);
    expect(
      await host.call(root, 'searchRecentPage', { text: 'needle' })
    ).toMatchObject({
      hits: [{ id: 'after-clear' }],
    });
    await host.call(root, 'setRoomState', 'room', { backfillDone: false });
    expect(await host.call(root, 'getRoomState', 'room')).toMatchObject({
      backfillDone: false,
    });
    await host.close(root);
    const opens = workers.methods.filter((method) => method === 'open').length;
    await host.clear(root);
    expect(workers.methods.filter((method) => method === 'open')).toHaveLength(
      opens
    );
  } finally {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  }
});

it.each(['close', 'switch'] as const)(
  'does not restore access or deliver old events when active clear races %s',
  async (action) => {
    const workers = createFakeWorkers();
    let releaseWipe: (() => void) | undefined;
    let sawWipe!: () => void;
    const wipeStarted = new Promise<void>((resolve) => {
      sawWipe = resolve;
    });
    const host = createSearchHost({
      spawn: () => {
        const worker = workers.spawn();
        let wipeId: number | undefined;
        return {
          ...worker,
          postMessage: (request) => {
            if (request.method === 'wipe') wipeId = request.id;
            worker.postMessage(request);
          },
          onMessage: (listener) =>
            worker.onMessage((response: WorkerResponse) => {
              if (response.id !== wipeId) {
                listener(response);
                return;
              }
              releaseWipe = () => listener(response);
              sawWipe();
            }),
        };
      },
    });
    const root = mkdtempSync(path.join(tmpdir(), 'search-clear-race-'));
    const current = {
      id: 1,
      send: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
    };
    const indexId = (userId: string) => path.join(root, userId);
    let sawClose!: () => void;
    const closeStarted = new Promise<void>((resolve) => {
      sawClose = resolve;
    });
    const handle = createE2EESearchIpcHandler({
      resolveServerUrl: () => 'https://server.example/',
      verifyUserId: async () => true,
      fetchOwnerKey: async () => null,
      openIndex: async (_url, userId) => ({
        indexId: indexId(userId),
        result: (await host.open(indexId(userId), {
          userId,
          dir: indexId(userId),
          indexKey: { persistent: true, key: randomBytes(32), reset: false },
        })) as { schemaVersion: number; encryptedAtRest: boolean },
      }),
      call: host.call,
      close: (id) => {
        sawClose();
        return host.close(id);
      },
      onIndexEvent: host.onIndexEvent,
      wipeIndex: host.discard,
      userIndexId: (_url, userId) => indexId(userId),
      logError: jest.fn(),
      logNotOpen: jest.fn(),
      logOwnerKeyError: jest.fn(),
    });
    const invoke = (method: string, ...args: unknown[]) =>
      handle({ sender: current }, method, ...args);
    try {
      await invoke('open', { userId: 'first' }, 'a'.repeat(32));
      const clearing = host.clear(indexId('first'));
      await wipeStarted;
      current.send.mockClear();
      const ending =
        action === 'close'
          ? invoke('close')
          : invoke('open', { userId: 'second' }, 'b'.repeat(32));
      await closeStarted;
      releaseWipe!();
      await Promise.all([clearing, ending]);
      expect(current.send).not.toHaveBeenCalled();
      if (action === 'close') {
        expect(host.indexIds()).toEqual([]);
        await expect(invoke('stats')).rejects.toThrow();
      } else {
        await invoke('stats');
        await host.close(indexId('first'));
        expect(host.indexIds()).toEqual([indexId('second')]);
      }
    } finally {
      releaseWipe?.();
      await invoke('close');
      await host.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  }
);

it('isolates index listeners and removes them on unsubscribe', async () => {
  const workers = createFakeWorkers();
  const host = createSearchHost({ spawn: workers.spawn });
  const root = mkdtempSync(path.join(tmpdir(), 'search-events-'));
  try {
    const first = path.join(root, 'first');
    const second = path.join(root, 'second');
    for (const dir of [first, second]) {
      // eslint-disable-next-line no-await-in-loop -- opens the two fixture indexes
      await host.open(dir, {
        userId: 'user',
        dir,
        indexKey: { persistent: true, key: randomBytes(32), reset: false },
      });
    }
    const received = jest.fn();
    const other = jest.fn();
    const unsubscribe = host.onIndexEvent(first, received);
    host.onIndexEvent(second, other);
    await host.call(first, 'remove', ['missing']);
    expect(received).toHaveBeenCalledWith({ type: 'changed' });
    expect(other).not.toHaveBeenCalled();
    unsubscribe();
    await host.call(first, 'remove', ['missing']);
    expect(received).toHaveBeenCalledTimes(1);
  } finally {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  }
});
