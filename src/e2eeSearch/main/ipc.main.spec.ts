import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSearchHost } from '../host';
import type { SearchHost, WorkerTransport } from '../host';
import {
  BRIDGE_METHODS,
  createE2EESearchIpcHandler,
  E2EE_SEARCH_GENERIC_ERROR,
  MAX_CALLS_IN_FLIGHT_PER_WEBVIEW,
} from '../ipc';
import type { E2EESearchSender } from '../ipc';
import { e2eeSearch } from '../preload';
import type { E2EESearchDoc, E2EESearchHit } from '../types';
import {
  E2EESearchInputError,
  MAX_BATCH_BODY_LENGTH,
  MAX_BATCH_SIZE,
  MAX_BODY_LENGTH,
} from '../validate';
import { createWorkerHandler } from '../workerHandler';
import type { WorkerResponse } from '../workerProtocol';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const NEEDLE = 'zanzibarquokka';
const SERVER_A = 'https://a.example.com/';
const SERVER_B = 'https://b.example.com/';

const spawn = (methods: string[]) => (): WorkerTransport => {
  const handler = createWorkerHandler({ DatabaseSync });
  const listeners: Array<(response: WorkerResponse) => void> = [];
  return {
    postMessage: (request) => {
      methods.push(request.method);
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

type FakeSender = E2EESearchSender & {
  destroy: () => void;
  navigate: () => void;
};

const createSender = (id: number): FakeSender => {
  const destroyed: Array<() => void> = [];
  const navigated: Array<() => void> = [];
  return {
    id,
    once: (_event, listener) => destroyed.push(listener),
    on: (_event, listener) => navigated.push(listener),
    destroy: () => destroyed.forEach((listener) => listener()),
    navigate: () => navigated.forEach((listener) => listener()),
  };
};

describe('E2EE search IPC handler', () => {
  let root: string;
  let host: SearchHost;
  let methods: string[];
  let servers: Map<number, string>;
  let handleEvent: ReturnType<typeof createE2EESearchIpcHandler>;
  let openGate: Promise<void> = Promise.resolve();
  // Calls to these indexes wait for `callGate` before they reach the worker.
  let callGate: Promise<void> = Promise.resolve();
  let gatedIndexIds: Set<string>;
  let logged: unknown[][];
  // The user that the server says owns each webview's login token. A
  // webview with no entry is logged in as the user that it claims.
  let sessionUsers: Map<number, string>;
  let verified: string[];
  // The wrap key that each openIndex call got.
  let wrapKeys: Array<Buffer | undefined>;
  const handle = (
    sender: E2EESearchSender,
    method: unknown,
    ...args: unknown[]
  ) => handleEvent({ sender }, method, ...args);
  const webviewA = createSender(11);
  const webviewB = createSender(22);
  const rootWindow = createSender(1);

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'e2ee-ipc-'));
    methods = [];
    host = createSearchHost({ spawn: spawn(methods) });
    servers = new Map([
      [webviewA.id, SERVER_A],
      [webviewB.id, SERVER_B],
    ]);
    openGate = Promise.resolve();
    callGate = Promise.resolve();
    gatedIndexIds = new Set();
    logged = [];
    sessionUsers = new Map();
    verified = [];
    wrapKeys = [];
    handleEvent = createE2EESearchIpcHandler({
      resolveServerUrl: ({ sender }) => servers.get(sender.id),
      verifyUserId: async ({ sender }, serverUrl, userId) => {
        verified.push(`${serverUrl} ${userId}`);
        return (sessionUsers.get(sender.id) ?? userId) === userId;
      },
      openIndex: async (serverUrl, userId, wrapKey) => {
        wrapKeys.push(wrapKey && Buffer.from(wrapKey));
        await openGate;
        const dir = path.join(
          root,
          createHash('sha256').update(serverUrl).digest('hex'),
          userId
        );
        const result = await host.open(dir, {
          userId,
          dir,
          indexKey: { persistent: true, key: randomBytes(32), reset: false },
        });
        return { indexId: dir, result: result as any };
      },
      call: async (indexId, method, ...args) => {
        if (gatedIndexIds.has(indexId)) await callGate;
        return host.call(indexId, method, ...args);
      },
      close: (indexId) => host.close(indexId),
      logError: (...args) => {
        logged.push(args);
      },
    });
  });

  afterEach(async () => {
    await host.dispose();
    rmSync(root, { recursive: true, force: true });
  });

  const searchIds = async (sender: E2EESearchSender) =>
    ((await handle(sender, 'search', { text: NEEDLE })) as E2EESearchHit[]).map(
      (hit) => hit.id
    );

  it('exposes the 9 methods of the backend interface on the bridge', () => {
    expect(Object.keys(e2eeSearch).sort()).toEqual([...BRIDGE_METHODS].sort());
    expect(BRIDGE_METHODS).toHaveLength(9);
  });

  it('keeps server A and server B in separate indexes for the same user', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    await handle(webviewB, 'open', { userId: 'user1' });
    await expect(
      handle(webviewA, 'upsert', [doc('mA', `secret ${NEEDLE}`)])
    ).resolves.toBeUndefined();

    expect(await searchIds(webviewA)).toEqual(['mA']);
    expect(await searchIds(webviewB)).toEqual([]);
    expect(await handle(webviewB, 'stats')).toMatchObject({ docs: 0 });
  });

  it('rejects a sender that is not a server webview', async () => {
    await expect(
      handle(rootWindow, 'open', { userId: 'user1' })
    ).rejects.toThrow('only to server webviews');
    await expect(
      handle(rootWindow, 'search', { text: NEEDLE })
    ).rejects.toThrow('only to server webviews');
  });

  it('rejects a call before open and an unknown method', async () => {
    await expect(handle(webviewA, 'search', { text: NEEDLE })).rejects.toThrow(
      'not open'
    );
    await handle(webviewA, 'open', { userId: 'user1' });
    await expect(handle(webviewA, 'save')).rejects.toBeInstanceOf(
      E2EESearchInputError
    );
    await expect(handle(webviewA, 'close')).rejects.toBeInstanceOf(
      E2EESearchInputError
    );
  });

  it('rejects an oversize batch, an oversize body and a bad user id', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    const tooMany = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) =>
      doc(`m${i}`, 'x')
    );
    await expect(handle(webviewA, 'upsert', tooMany)).rejects.toBeInstanceOf(
      E2EESearchInputError
    );
    await expect(
      handle(webviewA, 'upsert', [doc('m1', 'x'.repeat(MAX_BODY_LENGTH + 1))])
    ).rejects.toBeInstanceOf(E2EESearchInputError);
    await expect(
      handle(webviewA, 'remove', Array(MAX_BATCH_SIZE + 1).fill('m1'))
    ).rejects.toBeInstanceOf(E2EESearchInputError);
    await expect(
      handle(webviewA, 'open', { userId: '../user2' })
    ).rejects.toBeInstanceOf(E2EESearchInputError);
    expect(methods.filter((method) => method !== 'open')).toEqual([]);

    await expect(
      handle(webviewA, 'upsert', [doc('m1', 'x'.repeat(MAX_BODY_LENGTH))])
    ).resolves.toBeUndefined();
  });

  it('rejects an upsert whose bodies together pass the call limit', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    const body = 'x'.repeat(MAX_BODY_LENGTH);
    const count = Math.floor(MAX_BATCH_BODY_LENGTH / MAX_BODY_LENGTH) + 1;
    const docs = Array.from({ length: count }, (_, i) => doc(`m${i}`, body));
    await expect(handle(webviewA, 'upsert', docs)).rejects.toBeInstanceOf(
      E2EESearchInputError
    );
    expect(methods).not.toContain('upsert');
  });

  it('closes the session when the webview navigates or reloads', async () => {
    const webview = createSender(44);
    servers.set(webview.id, SERVER_A);
    await handle(webview, 'open', { userId: 'user4' });
    await expect(handle(webview, 'stats')).resolves.toMatchObject({ docs: 0 });

    webview.navigate();
    await expect(handle(webview, 'stats')).rejects.toThrow('not open');
    await handle(webview, 'open', { userId: 'user4' });
    await expect(handle(webview, 'stats')).resolves.toMatchObject({ docs: 0 });
  });

  it('closes the session and unbinds the user on a logout with no navigation', async () => {
    const webview = createSender(67);
    servers.set(webview.id, SERVER_A);
    sessionUsers.set(webview.id, 'userA');
    await handle(webview, 'open', { userId: 'userA' });
    await handle(webview, 'upsert', [doc('m1', NEEDLE)]);
    const closesBefore = methods.filter((m) => m === 'close').length;

    // The web client logs user A out and user B in, in the same document.
    handleEvent.endUserSession(SERVER_A);
    sessionUsers.set(webview.id, 'userB');

    await expect(handle(webview, 'search', { text: NEEDLE })).rejects.toThrow(
      'not open'
    );
    await expect(
      handle(webview, 'upsert', [doc('m2', NEEDLE)])
    ).rejects.toThrow('not open');
    await expect(handle(webview, 'wipe')).rejects.toThrow('not open');
    for (
      let wait = 0;
      wait < 100 &&
      methods.filter((m) => m === 'close').length === closesBefore;
      wait++
    ) {
      // eslint-disable-next-line no-await-in-loop -- polls until the close is sent
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(methods.filter((m) => m === 'close')).toHaveLength(closesBefore + 1);

    await expect(handle(webview, 'open', { userId: 'userA' })).rejects.toThrow(
      'another user'
    );
    await handle(webview, 'open', { userId: 'userB' });
    await expect(
      handle(webview, 'search', { text: NEEDLE })
    ).resolves.toHaveLength(0);
  });

  it('gives no session to an open of the old user that finishes after a logout', async () => {
    const webview = createSender(68);
    servers.set(webview.id, SERVER_A);
    let release = () => undefined as void;
    openGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const opening = handle(webview, 'open', { userId: 'userA' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    handleEvent.endUserSession(SERVER_A);
    release();
    await expect(opening).rejects.toThrow(E2EE_SEARCH_GENERIC_ERROR);
    await expect(handle(webview, 'stats')).rejects.toThrow('not open');
    // A logout on another server leaves this one alone.
    await handle(webview, 'open', { userId: 'userB' });
    handleEvent.endUserSession(SERVER_B);
    await expect(handle(webview, 'stats')).resolves.toMatchObject({ docs: 0 });
  });

  it('binds the first user id of a document until the webview navigates', async () => {
    const webview = createSender(66);
    servers.set(webview.id, SERVER_A);
    await handle(webview, 'open', { userId: 'user6' });
    await handle(webview, 'upsert', [doc('m1', NEEDLE)]);

    await expect(handle(webview, 'open', { userId: 'user7' })).rejects.toThrow(
      'another user'
    );
    await expect(
      handle(webview, 'search', { text: NEEDLE })
    ).resolves.toHaveLength(1);
    await expect(
      handle(webview, 'open', { userId: 'user6' })
    ).resolves.toBeDefined();

    webview.navigate();
    await handle(webview, 'open', { userId: 'user7' });
    await expect(
      handle(webview, 'search', { text: NEEDLE })
    ).resolves.toHaveLength(0);
  });

  it('refuses a user id that the server session does not own', async () => {
    const webview = createSender(88);
    servers.set(webview.id, SERVER_A);
    sessionUsers.set(webview.id, 'userB');

    await expect(handle(webview, 'open', { userId: 'userA' })).rejects.toThrow(
      'another user'
    );
    expect(verified).toEqual([`${SERVER_A} userA`]);
    expect(methods.filter((method) => method === 'open')).toHaveLength(0);
    await expect(handle(webview, 'search', { text: NEEDLE })).rejects.toThrow(
      'not open'
    );

    // The refused claim does not bind the document: the real user opens.
    await expect(
      handle(webview, 'open', { userId: 'userB' })
    ).resolves.toBeDefined();
    expect(methods.filter((method) => method === 'open')).toHaveLength(1);
  });

  it('sends a generic error when the server check fails', async () => {
    const webview = createSender(89);
    servers.set(webview.id, SERVER_A);
    let opened = 0;
    handleEvent = createE2EESearchIpcHandler({
      resolveServerUrl: ({ sender }) => servers.get(sender.id),
      verifyUserId: () => Promise.reject(new Error('fetch failed')),
      openIndex: async () => {
        opened += 1;
        return { indexId: 'x', result: {} as any };
      },
      call: () => Promise.reject(new Error('must not call')),
      close: async () => undefined,
      logError: (...args) => {
        logged.push(args);
      },
    });

    await expect(handle(webview, 'open', { userId: 'userA' })).rejects.toThrow(
      'E2EE search call failed'
    );
    expect(opened).toBe(0);
    expect(logged).toHaveLength(1);
  });

  it('binds the user id before the first open finishes', async () => {
    const webview = createSender(77);
    servers.set(webview.id, SERVER_A);
    let release = () => undefined as void;
    openGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = handle(webview, 'open', { userId: 'user8' });
    const second = expect(
      handle(webview, 'open', { userId: 'user9' })
    ).rejects.toThrow('another user');
    release();

    await expect(first).resolves.toBeDefined();
    await second;
    expect(methods.filter((method) => method === 'open')).toHaveLength(1);
  });

  it('closes an index that finishes opening after the webview ends', async () => {
    const webview = createSender(55);
    servers.set(webview.id, SERVER_A);
    let release = () => undefined as void;
    openGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const opening = handle(webview, 'open', { userId: 'user5' });
    webview.destroy();
    release();
    await opening;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(methods).toContain('close');
    await expect(handle(webview, 'stats')).rejects.toThrow('not open');
  });

  it('gives no session to the new document when an open finishes after a navigation', async () => {
    const webview = createSender(56);
    servers.set(webview.id, SERVER_A);
    await handle(webview, 'open', { userId: 'user12' });
    await handle(webview, 'upsert', [doc('m1', NEEDLE)]);
    // A close saves the dirty index first, so it can take more than a tick.
    const closes = () => methods.filter((method) => method === 'close');
    const closed = async (count: number) => {
      for (let wait = 0; wait < 100 && closes().length < count; wait++) {
        // eslint-disable-next-line no-await-in-loop -- polls until the close is sent
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    webview.navigate();
    await closed(1);

    let release = () => undefined as void;
    openGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const opening = handle(webview, 'open', { userId: 'user12' });
    // The user check resolves, and the index open waits on the gate.
    await new Promise((resolve) => setTimeout(resolve, 0));
    webview.navigate();
    release();
    await expect(opening).rejects.toThrow('E2EE search call failed');
    await closed(2);

    expect(closes()).toHaveLength(2);
    await expect(handle(webview, 'search', { text: NEEDLE })).rejects.toThrow(
      'not open'
    );
    // The new document is not bound to the user of the old open.
    await handle(webview, 'open', { userId: 'user13' });
    await expect(
      handle(webview, 'search', { text: NEEDLE })
    ).resolves.toHaveLength(0);
  });

  it('keeps the binding of the new document when a refused open finishes after a navigation', async () => {
    const webview = createSender(57);
    servers.set(webview.id, SERVER_A);
    let release = () => undefined as void;
    const verifyGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    handleEvent = createE2EESearchIpcHandler({
      resolveServerUrl: ({ sender }) => servers.get(sender.id),
      verifyUserId: async (_event, _serverUrl, userId) => {
        if (userId === 'user14') await verifyGate;
        // Only the binding of the document refuses user16.
        return userId !== 'user14';
      },
      openIndex: async (serverUrl, userId) => ({
        indexId: `${serverUrl} ${userId}`,
        result: {} as any,
      }),
      call: async () => ({ docs: 0 }),
      close: async () => undefined,
      logError: () => undefined,
    });

    const refused = handle(webview, 'open', { userId: 'user14' });
    webview.navigate();
    await handle(webview, 'open', { userId: 'user15' });
    release();
    await expect(refused).rejects.toThrow();

    // The new document stays bound to its own user.
    await expect(handle(webview, 'open', { userId: 'user16' })).rejects.toThrow(
      'another user'
    );
    await expect(handle(webview, 'stats')).resolves.toMatchObject({ docs: 0 });
  });

  it('closes the index when the webview is destroyed', async () => {
    const webview = createSender(33);
    servers.set(webview.id, SERVER_A);
    await handle(webview, 'open', { userId: 'user3' });
    webview.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(methods).toContain('close');
    await expect(handle(webview, 'stats')).rejects.toThrow('not open');
  });

  it('keeps no state for a destroyed webview when its id comes back', async () => {
    const first = createSender(88);
    servers.set(first.id, SERVER_A);
    await handle(first, 'open', { userId: 'user10' });
    first.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const second = createSender(88);
    await handle(second, 'open', { userId: 'user11' });
    await expect(handle(second, 'stats')).resolves.toMatchObject({ docs: 0 });

    second.navigate();
    await expect(handle(second, 'stats')).rejects.toThrow('not open');
  });

  it('sends a generic error to the page and the index id to the main log', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    const [indexId] = host.indexIds();
    // Settings > Clear closes the index while the page keeps its session.
    await host.discard(indexId);

    const error: Error = await handle(webviewA, 'search', {
      text: NEEDLE,
    }).then(
      () => {
        throw new Error('the call did not reject');
      },
      (reason: Error) => reason
    );

    expect(error.message).not.toContain(root);
    expect(error.message).not.toContain(path.basename(path.dirname(indexId)));
    expect(error.message).not.toContain('user1');
    expect(error.message).toBe('E2EE search call failed');
    expect(String(logged.flat().map(String))).toContain(indexId);
  });

  it('limits the calls in flight from one webview and keeps other servers running', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    gatedIndexIds = new Set(host.indexIds());
    await handle(webviewB, 'open', { userId: 'user1' });
    let release: () => void = () => undefined;
    callGate = new Promise((resolve) => {
      release = resolve;
    });

    const inFlight = Array.from(
      { length: MAX_CALLS_IN_FLIGHT_PER_WEBVIEW },
      () => handle(webviewA, 'search', { text: NEEDLE })
    );
    const error: Error = await handle(webviewA, 'search', {
      text: NEEDLE,
    }).then(
      () => {
        throw new Error('the call did not reject');
      },
      (reason: Error) => reason
    );
    expect(error.message).toBe(E2EE_SEARCH_GENERIC_ERROR);
    expect(error.message).not.toContain(root);
    await expect(handle(webviewB, 'search', { text: NEEDLE })).resolves.toEqual(
      []
    );

    release();
    await expect(Promise.all(inFlight)).resolves.toHaveLength(
      MAX_CALLS_IN_FLIGHT_PER_WEBVIEW
    );
    await expect(searchIds(webviewA)).resolves.toEqual([]);
  });

  it('keeps input errors visible to the page', async () => {
    await handle(webviewA, 'open', { userId: 'user1' });
    await expect(
      handle(webviewA, 'search', { text: 7 })
    ).rejects.toBeInstanceOf(E2EESearchInputError);
    expect(logged).toEqual([]);
  });

  // The web client can send a 32-byte key derived from
  // the user's E2EE private key. The handler checks it and gives it only to
  // the index open.
  it('gives a 32-byte wrap key from the page to the index open', async () => {
    const wrapKey = new Uint8Array(32).fill(5);
    await handle(webviewA, 'open', { userId: 'user1', wrapKey });
    await handle(webviewB, 'open', { userId: 'user1' });

    expect(wrapKeys).toEqual([Buffer.from(wrapKey), undefined]);
  });

  it.each([
    ['31 bytes', new Uint8Array(31)],
    ['33 bytes', new Uint8Array(33)],
    ['a string', 'a'.repeat(32)],
    ['an array of numbers', new Array(32).fill(1)],
    ['an ArrayBuffer', new ArrayBuffer(32)],
  ])('refuses a wrap key that is %s', async (_, wrapKey) => {
    await expect(
      handle(webviewA, 'open', { userId: 'user1', wrapKey })
    ).rejects.toBeInstanceOf(E2EESearchInputError);
    expect(wrapKeys).toEqual([]);
    expect(verified).toEqual([]);
  });
});
