import { createE2EESearchIpcHandler, E2EE_SEARCH_EVENT_CHANNEL } from '../ipc';
import type { E2EESearchSender } from '../ipc';
import type { E2EESearchIndexEvent } from '../types';

const tokenA = 'a'.repeat(32);
const tokenB = 'b'.repeat(32);

const sender = (id: number) => {
  const navigation: Array<() => void> = [];
  const destruction: Array<() => void> = [];
  return {
    id,
    send: jest.fn(),
    on: (_event: 'did-navigate', listener: () => void) =>
      navigation.push(listener),
    once: (_event: 'destroyed', listener: () => void) =>
      destruction.push(listener),
    navigate: () => navigation.forEach((listener) => listener()),
    destroy: () => destruction.forEach((listener) => listener()),
  };
};

const fixture = () => {
  const subscriptions: Array<{
    indexId: string;
    listener: (event: E2EESearchIndexEvent) => void;
    unsubscribe: jest.Mock;
  }> = [];
  const close = jest.fn(async () => undefined);
  const call = jest.fn(async () => ({ hits: [] }));
  const handle = createE2EESearchIpcHandler({
    resolveServerUrl: ({ sender: current }) =>
      `https://server-${current.id}.example/`,
    verifyUserId: async () => true,
    fetchOwnerKey: async () => null,
    openIndex: async (serverUrl, userId) => ({
      indexId: `${serverUrl}${userId}`,
      result: { schemaVersion: 2, encryptedAtRest: true },
    }),
    call,
    close,
    wipeIndex: async () => undefined,
    userIndexId: (serverUrl, userId) => `${serverUrl}${userId}`,
    logError: jest.fn(),
    logNotOpen: jest.fn(),
    logOwnerKeyError: jest.fn(),
    onIndexEvent: (indexId, listener) => {
      const unsubscribe = jest.fn();
      subscriptions.push({ indexId, listener, unsubscribe });
      return unsubscribe;
    },
  });
  const invoke = (
    current: E2EESearchSender,
    method: string,
    ...args: unknown[]
  ) => handle({ sender: current }, method, ...args);
  return { invoke, handle, subscriptions, close, call };
};

it('announces exact capabilities and forwards changed and lost only to the owning sender', async () => {
  const { invoke, subscriptions, call } = fixture();
  const first = sender(1);
  const second = sender(2);
  const opened = await invoke(first, 'open', { userId: 'user' }, tokenA);
  expect(opened).toMatchObject({
    capabilities: { recentCursor: 1, lifecycleEvents: 1, close: 1 },
  });
  await invoke(second, 'open', { userId: 'user' }, tokenB);
  subscriptions[0].listener({ type: 'changed' });
  subscriptions[0].listener({ type: 'lost' });
  expect(first.send.mock.calls).toEqual([
    [E2EE_SEARCH_EVENT_CHANNEL, tokenA, { type: 'changed' }],
    [E2EE_SEARCH_EVENT_CHANNEL, tokenA, { type: 'lost' }],
  ]);
  expect(second.send).not.toHaveBeenCalled();
  await invoke(first, 'searchRecentPage', {
    text: 'needle',
    cursor: { ts: 1, id: 'last' },
    rid: 'room',
  });
  expect(call).toHaveBeenCalledWith(
    'https://server-1.example/user',
    'searchRecentPage',
    expect.objectContaining({ cursor: { ts: 1, id: 'last' }, rid: 'room' })
  );
  await expect(
    invoke(first, 'searchRecentPage', {
      text: 'needle',
      cursor: { ts: NaN, id: '' },
    })
  ).rejects.toThrow();
});

it.each([
  'close',
  'navigate',
  'destroy',
  'logout',
  'switch',
  'reopen',
] as const)(
  'removes subscriptions and suppresses delayed delivery after %s',
  async (action) => {
    const { invoke, subscriptions, handle } = fixture();
    const current = sender(1);
    await invoke(current, 'open', { userId: 'first' }, tokenA);
    const old = subscriptions[0];
    if (action === 'close') await invoke(current, 'close');
    if (action === 'navigate') current.navigate();
    if (action === 'destroy') current.destroy();
    if (action === 'logout') handle.endUserSession('https://server-1.example/');
    if (action === 'switch')
      await invoke(current, 'open', { userId: 'second' }, tokenB);
    if (action === 'reopen')
      await invoke(current, 'open', { userId: 'first' }, tokenB);
    expect(old.unsubscribe).toHaveBeenCalledTimes(1);
    old.listener({ type: 'lost' });
    expect(current.send).not.toHaveBeenCalled();
    if (action === 'switch' || action === 'reopen') {
      subscriptions[1].listener({ type: 'changed' });
      expect(current.send).toHaveBeenCalledWith(
        E2EE_SEARCH_EVENT_CHANNEL,
        tokenB,
        { type: 'changed' }
      );
    }
  }
);

it('rejects an old owner-key lookup before it can reopen and close a newer session', async () => {
  let finish!: (value: null) => void;
  const ownerKey = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    )
    .mockResolvedValue(null);
  const openIndex = jest.fn(async () => ({
    indexId: 'shared',
    result: { schemaVersion: 2, encryptedAtRest: true },
  }));
  const close = jest.fn(async () => undefined);
  const handle = createE2EESearchIpcHandler({
    resolveServerUrl: () => 'https://server.example/',
    verifyUserId: async () => true,
    fetchOwnerKey: ownerKey,
    openIndex,
    close,
    call: async () => ({ docs: 0 }),
    wipeIndex: async () => undefined,
    userIndexId: () => 'shared',
    logError: jest.fn(),
    logNotOpen: jest.fn(),
    logOwnerKeyError: jest.fn(),
  });
  const current = sender(1);
  const first = handle({ sender: current }, 'open', { userId: 'user' }, tokenA);
  const rejected = expect(first).rejects.toThrow();
  await Promise.resolve();
  await handle({ sender: current }, 'open', { userId: 'user' }, tokenB);
  finish(null);
  await rejected;
  expect(openIndex).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  expect(await handle({ sender: current }, 'stats')).toEqual({ docs: 0 });
});

it('does not close a shared index when a superseded open returns after the current session', async () => {
  const opened = {
    indexId: 'shared',
    result: { schemaVersion: 2, encryptedAtRest: true },
  };
  let finish!: (value: typeof opened) => void;
  let started!: () => void;
  const opening = new Promise<void>((resolve) => {
    started = resolve;
  });
  const openIndex = jest
    .fn()
    .mockImplementationOnce(() => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    })
    .mockResolvedValue(opened);
  const close = jest.fn(async () => undefined);
  const handle = createE2EESearchIpcHandler({
    resolveServerUrl: () => 'https://server.example/',
    verifyUserId: async () => true,
    fetchOwnerKey: async () => null,
    openIndex,
    close,
    call: async () => ({ docs: 0 }),
    wipeIndex: async () => undefined,
    userIndexId: () => 'shared',
    logError: jest.fn(),
    logNotOpen: jest.fn(),
    logOwnerKeyError: jest.fn(),
  });
  const current = sender(1);
  const first = handle({ sender: current }, 'open', { userId: 'user' }, tokenA);
  const rejected = expect(first).rejects.toThrow();
  await opening;
  await handle({ sender: current }, 'open', { userId: 'user' }, tokenB);
  finish(opened);
  await rejected;
  expect(close).not.toHaveBeenCalled();
  expect(await handle({ sender: current }, 'stats')).toEqual({ docs: 0 });
});

it('does not announce events when the preload session token is absent or invalid', async () => {
  const { invoke, subscriptions } = fixture();
  const current = sender(1);
  expect(await invoke(current, 'open', { userId: 'user' })).not.toHaveProperty(
    'capabilities'
  );
  expect(
    await invoke(current, 'open', { userId: 'user' }, '../invalid')
  ).not.toHaveProperty('capabilities');
  expect(subscriptions).toHaveLength(0);
});
