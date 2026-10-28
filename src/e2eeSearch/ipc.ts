import { markExpectedError } from '../logging/expectedErrors';
import type { OwnerKeyFingerprint } from './ownerKey';
import { SCHEMA_VERSION } from './schema';
import type { E2EESearchOpenResult } from './types';
import {
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  E2EESearchInputError,
  validateDocs,
  validateIds,
  validateQuery,
  validateRid,
  validateRoomState,
  validateScope,
} from './validate';
import type { WorkerMethod } from './workerProtocol';

export const E2EE_SEARCH_CHANNEL = 'e2ee-search/call';

// The methods of `RocketChatDesktop.e2eeSearch`.
export const BRIDGE_METHODS = [
  'open',
  'upsert',
  'remove',
  'removeRoom',
  'listRooms',
  'search',
  'getRoomState',
  'setRoomState',
  'stats',
  'wipe',
  'close',
] as const;

export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

const isBridgeMethod = (value: unknown): value is BridgeMethod =>
  typeof value === 'string' &&
  (BRIDGE_METHODS as readonly string[]).includes(value);

// The part of an IPC sender that the handler reads.
export type E2EESearchSender = {
  id: number;
  once(event: 'destroyed', listener: () => void): unknown;
  on(event: 'did-navigate', listener: () => void): unknown;
};

// The part of an IPC event that the handler reads. The real event also
// carries the sender frame, which `resolveServerUrl` checks.
export type E2EESearchEvent = { sender: E2EESearchSender };

type IpcDeps = {
  // The server of the sender, from the main-process state. Undefined when
  // the sender is not the main frame of a known server webview.
  resolveServerUrl(event: E2EESearchEvent): string | undefined;
  // True only when the server says that the login session of the sender
  // belongs to `userId`. The page names the user, but a script on
  // the page cannot make the server accept the login token of another user.
  verifyUserId(
    event: E2EESearchEvent,
    serverUrl: string,
    userId: string
  ): Promise<boolean>;
  // The fingerprint of the E2EE public key that the server holds for the
  // user, on the login session of the sender. Null only when
  // the server says explicitly that it holds no key, and undefined when the
  // answer cannot tell. Called only after the server confirmed
  // the user.
  fetchOwnerKey(
    event: E2EESearchEvent,
    serverUrl: string,
    userId: string
  ): Promise<OwnerKeyFingerprint>;
  // `wrapKey` comes from the page. Without it, an index whose key is
  // wrapped by a wrap key does not open. `ownerKey` comes from the server:
  // an index of another E2EE key is replaced, and an unknown one (undefined)
  // deletes nothing.
  openIndex(
    serverUrl: string,
    userId: string,
    wrapKey?: Buffer,
    ownerKey?: OwnerKeyFingerprint
  ): Promise<{ indexId: string; result: E2EESearchOpenResult }>;
  call(
    indexId: string,
    method: WorkerMethod,
    ...args: unknown[]
  ): Promise<unknown>;
  close(indexId: string): Promise<void>;
  // Deletes the index (snapshot and key file) and closes it. A wipe of the
  // page comes here, not to the worker.
  wipeIndex(indexId: string): Promise<void>;
  // The index id of one user of one server, open or not.
  userIndexId(serverUrl: string, userId: string): string;
  // Gets the full error of a failed call, with the index id. It writes to
  // the main-process log, never to the page.
  logError(method: BridgeMethod, error: unknown): void;
  // A call before the index opens, or after it closes. The page makes such a
  // call at every start, so the handler calls this once per open cycle.
  logNotOpen(method: BridgeMethod): void;
  // Gets the error of an owner key fetch that failed while the open goes on.
  // It writes to the main-process log, never to the page.
  logOwnerKeyError(error: unknown): void;
};

type Session = { serverUrl: string; indexId: string };

const validateArgs = (method: BridgeMethod, args: unknown[]): unknown[] => {
  switch (method) {
    case 'upsert':
      return [validateDocs(args[0])];
    case 'remove':
      return [validateIds(args[0])];
    case 'removeRoom':
    case 'getRoomState':
      return [validateRid(args[0])];
    case 'search':
      return [validateQuery(args[0])];
    case 'setRoomState':
      return [validateRid(args[0]), validateRoomState(args[1])];
    default:
      return [];
  }
};

// The errors that the page can read: their messages name no path, no index
// id and no user. The worker sends errors back as name and message only.
const PAGE_ERROR_NAMES = new Set([
  'E2EESearchInputError',
  // The page learns only that its wrap key does not open the index.
  E2EE_SEARCH_KEY_MISMATCH_ERROR_NAME,
  'E2EESearchQuotaError',
]);

export const E2EE_SEARCH_GENERIC_ERROR = 'E2EE search call failed';

// The calls that one webview can have in flight at a time. All
// servers share one worker, so a page that sends calls without a limit
// would make the search of every other server wait behind them.
export const MAX_CALLS_IN_FLIGHT_PER_WEBVIEW = 32;

// Other errors (worker, SQLite, file system, keychain) can carry the index
// folder, which names the userData path and the server hash.
const toPageError = (
  deps: IpcDeps,
  method: BridgeMethod,
  error: unknown
): Error => {
  if (error instanceof Error && PAGE_ERROR_NAMES.has(error.name)) return error;
  deps.logError(method, error);
  return new Error(E2EE_SEARCH_GENERIC_ERROR);
};

// The wrap key that the page sent. IPC gives main its own copy
// of the bytes, so main zeroes it when the call ends, on every path.
const zeroPageWrapKey = (scope: unknown) => {
  if (typeof scope !== 'object' || scope === null) return;
  const { wrapKey } = scope as { wrapKey?: unknown };
  if (wrapKey instanceof Uint8Array) wrapKey.fill(0);
};

// The answer to an open with no wrap key for a user whose server
// holds an E2EE key, or cannot tell. No index is open, so nothing is
// encrypted at rest yet.
export const E2EE_SEARCH_LOCKED_RESULT: E2EESearchOpenResult = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  encryptedAtRest: false,
  locked: true,
});

export const E2EE_SEARCH_LOCKED_ERROR = 'E2EE search index is locked';

const VOID_METHODS = new Set<BridgeMethod>([
  'upsert',
  'remove',
  'removeRoom',
  'setRoomState',
  'wipe',
]);

// Runs in the main process for each bridge call. The server comes from the
// sender, never from the page, so one server cannot reach the index of
// another server: each server and user has its own index id (folder).
export const createE2EESearchIpcHandler = (deps: IpcDeps) => {
  const sessions = new Map<number, Session>();
  // The webviews whose last open returned `locked`. Their calls
  // fail with the locked error until an open with the wrap key.
  const lockedSenders = new Set<number>();
  // The webviews whose not-open call is already logged in this open cycle.
  const notOpenLogged = new Set<number>();
  // The user id that each document opened. A script on the page cannot
  // switch the document to the index of another user: only an open that the
  // server confirms for the page's login token can. A navigation or a reload
  // starts a new document, which can bind again.
  const boundUserIds = new Map<number, string>();

  // Each set holds an id only while its webview lives, or while an open of
  // a destroyed webview is still in flight.
  const watched = new Set<number>();
  const destroyed = new Set<number>();
  const pendingOpens = new Map<number, number>();
  // One token for each document of a live webview. A navigation gives the
  // webview a new token, so an open that started in the old document
  // cannot give its index to the new one.
  const documents = new Map<number, object>();
  const documentOf = (senderId: number) => {
    let token = documents.get(senderId);
    if (!token) {
      token = {};
      documents.set(senderId, token);
    }
    return token;
  };
  // A destroyed webview has no token: the `destroyed` set handles it.
  const isStale = (senderId: number, token: object) =>
    documents.has(senderId) && documents.get(senderId) !== token;
  // A confirmed open of another user took the document while this open
  // ran. A destroyed webview has no binding: the `destroyed` set handles it.
  const lostBinding = (senderId: number, userId: string) => {
    const bound = boundUserIds.get(senderId);
    return bound !== undefined && bound !== userId;
  };

  const closeSession = (senderId: number) => {
    notOpenLogged.delete(senderId);
    lockedSenders.delete(senderId);
    const session = sessions.get(senderId);
    if (!session) return;
    sessions.delete(senderId);
    void deps.close(session.indexId).catch(() => undefined);
  };

  // A session belongs to one document. A reload, a navigation or the end of
  // the webview closes it, so the next page must call open again.
  const watch = (sender: E2EESearchSender) => {
    if (watched.has(sender.id)) return;
    watched.add(sender.id);
    sender.on('did-navigate', () => {
      documents.set(sender.id, {});
      boundUserIds.delete(sender.id);
      closeSession(sender.id);
    });
    sender.once('destroyed', () => {
      watched.delete(sender.id);
      documents.delete(sender.id);
      senderServers.delete(sender.id);
      if (pendingOpens.has(sender.id)) destroyed.add(sender.id);
      boundUserIds.delete(sender.id);
      closeSession(sender.id);
    });
  };

  // The server of each webview that called open, so a logout signal of a
  // server reaches its documents.
  const senderServers = new Map<number, string>();

  // The web client can log a user out and another user in without a
  // navigation. A logout then ends the document's session like a reload
  // does: the index closes, the user binding goes, and an open in flight
  // for the old user gets no session.
  const endUserSession = (serverUrl: string) => {
    for (const [senderId, url] of senderServers) {
      if (url !== serverUrl) continue;
      if (documents.has(senderId)) documents.set(senderId, {});
      boundUserIds.delete(senderId);
      closeSession(senderId);
    }
  };

  // An E2E key reset while E2EE is locked. The page has no wrap
  // key, so no index is open, but the new E2E key cannot open the old index
  // and no file of it must stay. The server must confirm the user, like an
  // open does, and the document binds to that user. The
  // page gets no more power than an open and a wipe with the right key: it
  // can delete only the index of its own logged-in user.
  const wipeClosedIndex = async (
    event: E2EESearchEvent,
    serverUrl: string,
    scope: unknown
  ): Promise<undefined> => {
    const { sender } = event;
    const { userId, wrapKey } = validateScope(scope);
    // A wipe does not use the wrap key.
    wrapKey?.fill(0);
    watch(sender);
    const token = documentOf(sender.id);
    const boundUserId = boundUserIds.get(sender.id);
    if (boundUserId !== undefined && boundUserId !== userId) {
      throw new Error('E2EE search index is open for another user');
    }
    let owned: boolean | 'failed';
    try {
      owned = (await deps.verifyUserId(event, serverUrl, userId)) === true;
    } catch (error) {
      deps.logError('wipe', error);
      owned = 'failed';
    }
    if (isStale(sender.id, token)) {
      throw new Error(E2EE_SEARCH_GENERIC_ERROR);
    }
    if (owned !== true) {
      throw new Error(
        owned === 'failed'
          ? E2EE_SEARCH_GENERIC_ERROR
          : 'E2EE search index is open for another user'
      );
    }
    const current = boundUserIds.get(sender.id);
    if (current !== undefined && current !== userId) {
      throw new Error('E2EE search index is open for another user');
    }
    boundUserIds.set(sender.id, userId);
    senderServers.set(sender.id, serverUrl);
    await deps
      .wipeIndex(deps.userIndexId(serverUrl, userId))
      .catch((error: unknown) => {
        throw toPageError(deps, 'wipe', error);
      });
    return undefined;
  };

  // The web client logs out. The index of this webview closes with a save
  // and stays on disk, and the call returns when the worker closed it. An
  // open in flight gets no session, like after a logout signal. The user
  // binding stays: only a navigation or the desktop logout signal ends it.
  const closeIndex = async (
    sender: E2EESearchSender,
    serverUrl: string
  ): Promise<undefined> => {
    watch(sender);
    if (documents.has(sender.id)) documents.set(sender.id, {});
    notOpenLogged.delete(sender.id);
    lockedSenders.delete(sender.id);
    const session = sessions.get(sender.id);
    if (!session || session.serverUrl !== serverUrl) return undefined;
    sessions.delete(sender.id);
    await deps.close(session.indexId).catch((error: unknown) => {
      throw toPageError(deps, 'close', error);
    });
    return undefined;
  };

  // The calls of each webview that have not returned yet.
  const callsInFlight = new Map<number, number>();

  const handleCall = async (
    event: E2EESearchEvent,
    serverUrl: string,
    method: BridgeMethod,
    args: unknown[]
  ): Promise<unknown> => {
    const { sender } = event;
    if (method === 'open') {
      const { userId, wrapKey } = validateScope(args[0]);
      watch(sender);
      senderServers.set(sender.id, serverUrl);
      const token = documentOf(sender.id);
      const boundUserId = boundUserIds.get(sender.id);
      // The web client can log another user in on the same document with no
      // logout (`loginWithToken`). The open of that user switches the
      // document only after the server confirms the user. Until then, the
      // binding and the session of the bound user stay.
      const switchesUser = boundUserId !== undefined && boundUserId !== userId;
      // Bind before the open finishes, so two opens cannot race.
      const newBinding = boundUserId === undefined;
      if (newBinding) boundUserIds.set(sender.id, userId);
      pendingOpens.set(sender.id, (pendingOpens.get(sender.id) ?? 0) + 1);
      try {
        let owned: boolean | 'failed';
        try {
          owned = (await deps.verifyUserId(event, serverUrl, userId)) === true;
        } catch (error) {
          deps.logError(method, error);
          owned = 'failed';
        }
        // The old document is gone, and the new one keeps its own binding.
        if (isStale(sender.id, token)) {
          throw new Error(E2EE_SEARCH_GENERIC_ERROR);
        }
        if (owned !== true) {
          // A refused claim does not bind the document, so the real user
          // can still open. A confirmed switch can bind another user while
          // this check runs, and that binding stays.
          if (newBinding && boundUserIds.get(sender.id) === userId) {
            boundUserIds.delete(sender.id);
          }
          throw new Error(
            owned === 'failed'
              ? E2EE_SEARCH_GENERIC_ERROR
              : 'E2EE search index is open for another user'
          );
        }
        if (switchesUser && boundUserIds.get(sender.id) !== userId) {
          // The server confirmed that the document now belongs to `userId`.
          // The document ends the session of the other user like a logout
          // does: its index closes (the worker zeroes the key), and an open
          // in flight for that user gets no session (`lostBinding`). A
          // reload gives the page the same power, so the switch gives it no
          // more.
          boundUserIds.set(sender.id, userId);
          closeSession(sender.id);
        }
        // A server that cannot tell the key only leaves the open as it was
        // before the key check: nothing is deleted.
        const ownerKey = await deps
          .fetchOwnerKey(event, serverUrl, userId)
          .catch((error: unknown) => {
            deps.logOwnerKeyError(error);
            return undefined;
          });
        // The index of a user with an E2EE key opens only sealed
        // by the wrap key. The server, not the page, tells whether the user
        // has a key, and an unknown answer counts as a key (fail closed).
        // Before E2EE unlock the page has no wrap key, so no index opens, no
        // key file is made and no index file is written. A key file that is
        // not sealed yet is sealed at the next open with the wrap key
        // (keyStore.ts).
        if (!wrapKey && ownerKey !== null) {
          if (isStale(sender.id, token) || lostBinding(sender.id, userId)) {
            throw new Error(E2EE_SEARCH_GENERIC_ERROR);
          }
          closeSession(sender.id);
          if (!destroyed.has(sender.id)) lockedSenders.add(sender.id);
          return E2EE_SEARCH_LOCKED_RESULT;
        }
        const { indexId, result } = await deps
          .openIndex(serverUrl, userId, wrapKey, ownerKey)
          .catch((error: unknown) => {
            throw toPageError(deps, method, error);
          });
        if (isStale(sender.id, token) || lostBinding(sender.id, userId)) {
          await deps.close(indexId).catch(() => undefined);
          throw new Error(E2EE_SEARCH_GENERIC_ERROR);
        }
        const previous = sessions.get(sender.id);
        if (previous && previous.indexId !== indexId) {
          await deps.close(previous.indexId).catch(() => undefined);
        }
        sessions.set(sender.id, { serverUrl, indexId });
        lockedSenders.delete(sender.id);
        // The webview can end while the index opens.
        if (destroyed.has(sender.id)) closeSession(sender.id);
        return result;
      } finally {
        // The open used the wrap key once, or did not reach the
        // index. Either way, no copy stays in memory.
        wrapKey?.fill(0);
        const pending = (pendingOpens.get(sender.id) ?? 1) - 1;
        if (pending > 0) {
          pendingOpens.set(sender.id, pending);
        } else {
          pendingOpens.delete(sender.id);
          destroyed.delete(sender.id);
        }
      }
    }

    const session = sessions.get(sender.id);
    if (method === 'close') return closeIndex(sender, serverUrl);
    if (
      method === 'wipe' &&
      args[0] !== undefined &&
      (!session || session.serverUrl !== serverUrl)
    ) {
      return wipeClosedIndex(event, serverUrl, args[0]);
    }
    if (!session || session.serverUrl !== serverUrl) {
      // The expected state is logged here, once per open cycle. Electron
      // would log the rejection with its stack, so the console skips it.
      watch(sender);
      if (!notOpenLogged.has(sender.id)) {
        notOpenLogged.add(sender.id);
        deps.logNotOpen(method);
      }
      throw markExpectedError(
        new Error(
          lockedSenders.has(sender.id)
            ? E2EE_SEARCH_LOCKED_ERROR
            : 'E2EE search index is not open'
        )
      );
    }
    if (method === 'wipe') {
      // The page that opened the index can already remove every row of it.
      // The key file goes too, so after an E2E key reset the new wrap key
      // opens a new index. The user binding stays, and the page can open
      // the same user again.
      sessions.delete(sender.id);
      await deps.wipeIndex(session.indexId).catch((error: unknown) => {
        throw toPageError(deps, method, error);
      });
      return undefined;
    }
    const value = await deps
      .call(session.indexId, method, ...validateArgs(method, args))
      .catch((error: unknown) => {
        throw toPageError(deps, method, error);
      });
    return VOID_METHODS.has(method) ? undefined : value;
  };

  const handleEvent = async (
    event: E2EESearchEvent,
    method: unknown,
    ...args: unknown[]
  ): Promise<unknown> => {
    if (!isBridgeMethod(method)) {
      throw new E2EESearchInputError('unknown E2EE search method');
    }
    const serverUrl = deps.resolveServerUrl(event);
    if (!serverUrl) {
      throw new Error('E2EE search is available only to server webviews');
    }
    const senderId = event.sender.id;
    const inFlight = callsInFlight.get(senderId) ?? 0;
    if (inFlight >= MAX_CALLS_IN_FLIGHT_PER_WEBVIEW) {
      throw new Error(E2EE_SEARCH_GENERIC_ERROR);
    }
    callsInFlight.set(senderId, inFlight + 1);
    try {
      return await handleCall(event, serverUrl, method, args);
    } finally {
      const left = (callsInFlight.get(senderId) ?? 1) - 1;
      if (left > 0) callsInFlight.set(senderId, left);
      else callsInFlight.delete(senderId);
    }
  };

  const handleEventAndZeroWrapKey = async (
    event: E2EESearchEvent,
    method: unknown,
    ...args: unknown[]
  ): Promise<unknown> => {
    try {
      return await handleEvent(event, method, ...args);
    } finally {
      zeroPageWrapKey(args[0]);
    }
  };

  return Object.assign(handleEventAndZeroWrapKey, { endUserSession });
};
