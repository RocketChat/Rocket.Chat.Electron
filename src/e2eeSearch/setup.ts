import path from 'node:path';

import type { IpcMainInvokeEvent } from 'electron';
import { app, ipcMain, safeStorage, utilityProcess } from 'electron';

import { loggers } from '../logging/scopes';
import { dispatch, listen, select } from '../store';
import {
  E2EE_SEARCH_INDEX_STATS_UPDATED,
  SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED,
  SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  WEBVIEW_USER_LOGGED_IN,
} from '../ui/actions';
import {
  createDevTestKeySafeStorage,
  DEV_TEST_KEY_FILE_NAME,
} from './devTestKey';
import { summarizeError } from './errorSummary';
import { createSearchHost } from './host';
import type { SearchHost, WorkerTransport } from './host';
import { createE2EESearchIpcHandler, E2EE_SEARCH_CHANNEL } from './ipc';
import { isActuallyPackaged, selectAppKeySource } from './keySource';
import { createKeyStore } from './keyStore';
import {
  collectIndexStats,
  createUserIndexLimiter,
  deleteAllIndexes,
  indexDirOf,
  serverDirName,
  userDirName,
} from './lifecycle';
import {
  E2EESearchOwnerKeyChangedError,
  fingerprintPublicKey,
  loadOwnedIndexKey,
} from './ownerKey';
import type { OwnerKeyFingerprint } from './ownerKey';
import type { E2EESearchOpenResult } from './types';
import {
  fetchServerPublicKey,
  NO_KEY_RETRY_DELAYS_MS,
  READ_LOGIN_TOKEN_SCRIPT,
  verifyServerUserId,
} from './verifyUser';
import { workerEnvOf } from './workerEnv';
import type { WorkerOpenResult } from './workerProtocol';

// A quit waits at most this long for the last snapshot.
const QUIT_SAVE_TIMEOUT_MS = 5_000;

export const WORKER_FILE_NAME = 'e2eeSearchWorker.js';

const spawnUtilityWorker = (): WorkerTransport => {
  const child = utilityProcess.fork(
    path.join(app.getAppPath(), 'app', WORKER_FILE_NAME),
    [],
    {
      serviceName: 'Rocket.Chat E2EE Search',
      env: workerEnvOf(process.env, isActuallyPackaged),
    }
  );
  return {
    postMessage: (request) => child.postMessage(request),
    onMessage: (listener) => child.on('message', listener),
    onExit: (listener) => child.on('exit', listener),
    kill: () => {
      child.kill();
    },
  };
};

let host: SearchHost | undefined;

export const getE2EESearchHost = (): SearchHost => {
  host ??= createSearchHost({
    spawn: spawnUtilityWorker,
    onSaveError: (_indexId, error) =>
      loggers.e2eeSearch.warn('snapshot save failed', summarizeError(error)),
  });
  return host;
};

// The index folder: one folder for each server, with
// one sub-folder for each user.
export const getIndexRootDir = (): string =>
  path.join(app.getPath('userData'), 'e2ee-search');

export const getServerIndexDir = (serverUrl: string): string =>
  path.join(getIndexRootDir(), serverDirName(serverUrl));

export const getIndexDir = (serverUrl: string, userId: string): string =>
  indexDirOf(getIndexRootDir(), serverUrl, userId);

// A dev build with ROCKETCHAT_E2EE_SEARCH_MEMORY_ONLY=true never asks the
// keychain: the key store sees no encryption, so the index stays in memory
// and nothing is written to disk. An unattended dev harness needs this,
// because the dev Electron binary has no keychain grant and macOS shows a
// password dialog.
const noKeychain: Parameters<typeof createKeyStore>[0]['safeStorage'] = {
  isAsyncEncryptionAvailable: async () => false,
  encryptStringAsync: () => Promise.reject(new Error('no keychain')),
  decryptStringAsync: () => Promise.reject(new Error('no keychain')),
  getSelectedStorageBackend: () => 'unknown',
};

// A dev build with ROCKETCHAT_E2EE_SEARCH_DEV_TEST_KEY=true wraps the index
// key with a random key in a file of the dev profile instead of the keychain
// (devTestKey.ts). The encrypted snapshot is still written.
// One instance for the app, so that two first opens cannot create two keys.
let devTestKeyStorage:
  | ReturnType<typeof createDevTestKeySafeStorage>
  | undefined;

const getSafeStorage = () => {
  switch (selectAppKeySource(process.env.NODE_ENV, process.env)) {
    case 'memory-only':
      return noKeychain;
    case 'dev-test-key':
      devTestKeyStorage ??= createDevTestKeySafeStorage(
        path.join(app.getPath('userData'), DEV_TEST_KEY_FILE_NAME)
      );
      return devTestKeyStorage;
    default:
      return safeStorage;
  }
};

// The at-rest state of each index that the worker opened, for Settings.
const encryptedAtRest = new Map<string, boolean>();

// One limiter for the app: it keeps one plain user index for each server,
// and the sealed indexes next to it.
let userIndexLimiter: ReturnType<typeof createUserIndexLimiter> | undefined;
const getUserIndexLimiter = () => {
  userIndexLimiter ??= createUserIndexLimiter({
    host: {
      indexIds: () => getE2EESearchHost().indexIds(),
      discard: (indexId) => getE2EESearchHost().discard(indexId),
      close: (indexId) => getE2EESearchHost().close(indexId),
    },
    // An index sealed by a wrap key survives a logout.
    isSealed: (indexDir) =>
      createKeyStore({
        dir: indexDir,
        safeStorage: getSafeStorage(),
      }).isSealed(),
    // The reducer removes the server before the removal listener runs.
    isServerKnown: (serverDir) =>
      select(({ servers }) => servers).some(
        ({ url }) => getServerIndexDir(url) === serverDir
      ),
  });
  return userIndexLimiter;
};

export const openE2EESearchIndex = async (
  serverUrl: string,
  userId: string,
  wrapKey?: Buffer,
  ownerKey?: OwnerKeyFingerprint
): Promise<{ indexId: string; result: E2EESearchOpenResult }> => {
  const dir = getIndexDir(serverUrl, userId);
  return getUserIndexLimiter().admit(
    getServerIndexDir(serverUrl),
    userDirName(userId),
    async () => {
      // An index of an old E2EE key is replaced.
      // The wrap key is used once and not kept in memory.
      const indexKey = await loadOwnedIndexKey({
        dir,
        ownerKey,
        host: getE2EESearchHost(),
        loadKey: () =>
          createKeyStore({ dir, safeStorage: getSafeStorage() }).load({
            wrapKey,
          }),
        onOwnerKeyChanged: () =>
          loggers.e2eeSearch.info(
            'index replaced',
            summarizeError(new E2EESearchOwnerKeyChangedError())
          ),
      }).finally(() => wrapKey?.fill(0));
      if (!indexKey.persistent && indexKey.reason === 'keychain-timeout') {
        loggers.e2eeSearch.warn(
          'keychain did not answer in time, the index is memory-only'
        );
      }
      const { store, fileStoreError, ...result } =
        (await getE2EESearchHost().open(dir, {
          userId,
          dir,
          indexKey,
        })) as WorkerOpenResult;
      if (fileStoreError) {
        loggers.e2eeSearch.warn(
          'file store did not open, using the snapshot store',
          summarizeError(fileStoreError)
        );
      }
      loggers.e2eeSearch.info('index opened', { store });
      encryptedAtRest.set(dir, result.encryptedAtRest);
      return { indexId: dir, result };
    }
  );
};

// will-quit runs after the windows close. When an index has unsaved changes,
// hold the quit until the worker writes its snapshot, then finish it with
// app.exit, because a second app.quit() would run every quit listener again.
// The server of a sender: only the main frame of a known server webview has
// one, and only while that frame shows a page of the server's origin.
const resolveServerUrl = ({
  sender,
  senderFrame,
}: IpcMainInvokeEvent): string | undefined => {
  if (sender.getType() !== 'webview') return undefined;
  if (!senderFrame || senderFrame !== sender.mainFrame) return undefined;
  const serverUrl = select(({ servers }) => servers).find(
    (server) => server.webContentsId === sender.id
  )?.url;
  if (!serverUrl) return undefined;
  try {
    return new URL(senderFrame.url).origin === new URL(serverUrl).origin
      ? serverUrl
      : undefined;
  } catch {
    return undefined;
  }
};

const publishIndexStats = async (): Promise<void> => {
  try {
    const stats = await collectIndexStats({
      host: getE2EESearchHost(),
      rootDir: getIndexRootDir(),
      serverUrls: select(({ servers }) => servers).map(({ url }) => url),
      isEncryptedAtRest: (indexId) => encryptedAtRest.get(indexId),
    });
    dispatch({ type: E2EE_SEARCH_INDEX_STATS_UPDATED, payload: stats });
  } catch (error) {
    loggers.e2eeSearch.warn('index stats failed', summarizeError(error));
  }
};

// The login session of the sender webview, for the requests that ask the
// server about the user.
const serverRequestsOf = (event: IpcMainInvokeEvent) => {
  const { sender } = event;
  return {
    readLoginToken: () => sender.executeJavaScript(READ_LOGIN_TOKEN_SCRIPT),
    // The webview's own session, so its proxy and certificate rules apply to
    // the check.
    fetch: (url: string, init: RequestInit) => sender.session.fetch(url, init),
  };
};

export const setupE2EESearch = (): void => {
  const handleCall = createE2EESearchIpcHandler({
    resolveServerUrl: (event) => resolveServerUrl(event as IpcMainInvokeEvent),
    verifyUserId: (event, serverUrl, userId) =>
      verifyServerUserId(
        serverRequestsOf(event as IpcMainInvokeEvent),
        serverUrl,
        userId
      ),
    fetchOwnerKey: async (event, serverUrl, userId) => {
      const publicKey = await fetchServerPublicKey(
        {
          ...serverRequestsOf(event as IpcMainInvokeEvent),
          noKeyRetryDelaysMs: NO_KEY_RETRY_DELAYS_MS,
        },
        serverUrl,
        userId
      );
      // Only an explicit null of the server means "no key".
      return typeof publicKey === 'string'
        ? fingerprintPublicKey(publicKey)
        : publicKey;
    },
    openIndex: openE2EESearchIndex,
    call: (indexId, method, ...args) =>
      getE2EESearchHost().call(indexId, method, ...args),
    close: (indexId) => getE2EESearchHost().close(indexId),
    wipeIndex: (indexId) =>
      getUserIndexLimiter()
        .deleteUserIndex(path.dirname(indexId), indexId)
        .finally(publishIndexStats),
    userIndexId: getIndexDir,
    logError: (method, error) =>
      loggers.e2eeSearch.error(
        `bridge call ${method} failed`,
        summarizeError(error)
      ),
    logOwnerKeyError: (error) =>
      loggers.e2eeSearch.warn('owner key fetch failed', summarizeError(error)),
  });
  ipcMain.handle(E2EE_SEARCH_CHANNEL, (event, method, ...args) =>
    handleCall(event, method, ...args)
  );

  listen(SIDE_BAR_REMOVE_SERVER_CLICKED, ({ payload: serverUrl }) => {
    // Through the limiter, so an open of the server that waits or
    // runs cannot write the folder again after the delete.
    getUserIndexLimiter()
      .removeServer(getServerIndexDir(serverUrl))
      .catch((error) =>
        loggers.e2eeSearch.warn(
          'index delete failed for a removed server',
          summarizeError(error)
        )
      )
      .finally(publishIndexStats);
  });

  // A logout deletes the index of the user, unless a wrap key sealed it.
  // Like the login data clear
  // (`handleUserLoggedOutDataClearing`), only a change from logged in to
  // logged out counts. The page sends this signal, so the delete on the next
  // confirmed open of another user is the main guard, not this one.
  const userLoggedInByUrl = new Map<string, boolean | undefined>();
  listen(WEBVIEW_USER_LOGGED_IN, ({ payload: { url, userLoggedIn } }) => {
    const wasLoggedIn = userLoggedInByUrl.get(url);
    userLoggedInByUrl.set(url, userLoggedIn);
    // The next user of the same page must open again. A close of an
    // index that is not open does nothing, so every logout counts here.
    if (userLoggedIn === false) handleCall.endUserSession(url);
    if (wasLoggedIn !== true || userLoggedIn !== false) return;
    getUserIndexLimiter()
      .deleteUserIndexes(getServerIndexDir(url))
      .catch((error) =>
        loggers.e2eeSearch.warn(
          'index delete failed after a logout',
          summarizeError(error)
        )
      )
      .finally(publishIndexStats);
  });

  listen(SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED, () => {
    deleteAllIndexes(getE2EESearchHost(), getIndexRootDir())
      .catch((error) =>
        loggers.e2eeSearch.warn('index clear failed', summarizeError(error))
      )
      .finally(publishIndexStats);
  });

  listen(SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED, () => {
    void publishIndexStats();
  });

  app.on('will-quit', (event) => {
    if (!host?.hasUnsavedChanges()) {
      void host?.dispose();
      return;
    }
    event.preventDefault();
    const current = host;
    host = undefined;
    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, QUIT_SAVE_TIMEOUT_MS)
    );
    void Promise.race([current.dispose(), timeout]).finally(() => app.exit(0));
  });
};
