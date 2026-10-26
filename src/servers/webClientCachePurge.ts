import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { app, type Session, type WebContents } from 'electron';

import { loggers } from '../logging/scopes';
import { listen } from '../store';
import { WEBVIEW_SERVER_VERSION_UPDATED } from '../ui/actions';
import { getWebContentsByServerUrl } from '../ui/main/serverView';

// Old web clients wrote decrypted E2EE last messages into their IndexedDB
// store cache. Chromium keeps the old bytes in its LevelDB files after the
// page overwrites or deletes them, and only a main-process clear removes
// them. The clear runs one time per server, only when the origin's
// IndexedDB holds nothing but caches that the web client rebuilds, and only
// when the web client no longer writes decrypted text into that cache.

export type PurgeState = Record<string, 'blocked' | 'waiting' | 'purged'>;

type ReadState = () => Promise<PurgeState>;
type WriteState = (state: PurgeState) => Promise<void>;

const ISOLATED_WORLD_ID = 1031;
const METEOR_IMPORT_CACHE = 'MeteorDynamicImportCache';

const originOf = (url: string): string | undefined => {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

// localforage names its database after `document.baseURI`.
export const isCacheOnlyIndexedDb = (
  names: string[],
  serverUrl: string
): boolean => {
  const serverOrigin = originOf(serverUrl);
  return names.every(
    (name) =>
      name === METEOR_IMPORT_CACHE ||
      (serverOrigin !== undefined && originOf(name) === serverOrigin)
  );
};

const statePath = (): string =>
  join(app.getPath('userData'), 'web-client-cache-purge.json');

const readStateFile: ReadState = async () => {
  try {
    return JSON.parse(await readFile(statePath(), 'utf8')) as PurgeState;
  } catch {
    return {};
  }
};

const writeStateFile: WriteState = async (state) => {
  await writeFile(statePath(), JSON.stringify(state), 'utf8');
};

// Runs in an isolated world of the server page. It opens only databases
// that already exist, and it returns the database names and whether a cached
// room or subscription still holds a decrypted E2EE last message (an old web
// client writes those again, so a purge would not last). No message text
// leaves the page.
const INSPECT_SCRIPT = `(async () => {
  const names = (await indexedDB.databases()).map((db) => db.name);
  const isDecrypted = (record) =>
    !!record && typeof record === 'object' && !!record.lastMessage &&
    record.lastMessage.t === 'e2e' && record.lastMessage.e2e === 'done';
  const readAll = (name) => new Promise((resolve) => {
    const request = indexedDB.open(name);
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyvaluepairs')) { db.close(); resolve([]); return; }
      const all = db.transaction('keyvaluepairs', 'readonly').objectStore('keyvaluepairs').getAll();
      all.onerror = () => { db.close(); resolve([]); };
      all.onsuccess = () => { db.close(); resolve(all.result); };
    };
  });
  let decrypted = false;
  for (const name of names) {
    if (name === location.origin + '/' || name.startsWith(location.origin + '/')) {
      const values = await readAll(name);
      decrypted = decrypted || values.some((value) =>
        !!value && Array.isArray(value.records) && value.records.some(isDecrypted));
    }
  }
  return { names, decrypted };
})()`;

export type WebClientDatabases = { names: string[]; decrypted: boolean };

// `undefined` means: purge now.
export const nextPurgeState = (
  current: PurgeState[string] | undefined,
  { names, decrypted }: WebClientDatabases,
  serverUrl: string
): PurgeState[string] | undefined => {
  if (!isCacheOnlyIndexedDb(names, serverUrl)) {
    return 'blocked';
  }
  if (decrypted) {
    return 'waiting';
  }
  return current === 'purged' ? 'purged' : undefined;
};

const isWebClientDatabases = (value: unknown): value is WebClientDatabases =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as WebClientDatabases).names) &&
  (value as WebClientDatabases).names.every((n) => typeof n === 'string') &&
  typeof (value as WebClientDatabases).decrypted === 'boolean';

type GuestWebContents = Pick<
  WebContents,
  'executeJavaScriptInIsolatedWorld' | 'reload'
> & { session: Pick<Session, 'clearStorageData'> };

// A clear issued before the page uses its partition left the bytes on disk in
// the app, so the clear runs on the live session and the page reloads.
export const purgeWebClientCacheOnce = async (
  serverUrl: string,
  guestWebContents: GuestWebContents,
  readState: ReadState,
  writeState: WriteState
): Promise<void> => {
  const origin = originOf(serverUrl);
  if (!origin) {
    return;
  }
  const result: unknown =
    await guestWebContents.executeJavaScriptInIsolatedWorld(ISOLATED_WORLD_ID, [
      { code: INSPECT_SCRIPT },
    ]);
  if (!isWebClientDatabases(result)) {
    return;
  }

  const state = await readState();
  let next = nextPurgeState(state[serverUrl], result, serverUrl);
  if (next === 'blocked') {
    loggers.e2eeSearch.warn(
      'IndexedDB has a database that is not a cache; old cache bytes kept',
      { serverUrl, databases: result.names.length }
    );
  }
  if (next === undefined) {
    await guestWebContents.session.clearStorageData({
      origin,
      storages: ['indexdb'],
    });
    next = 'purged';
    await writeState({ ...state, [serverUrl]: next });
    guestWebContents.reload();
    return;
  }
  if (state[serverUrl] !== next) {
    await writeState({ ...state, [serverUrl]: next });
  }
};

export const setupWebClientCachePurge = (): void => {
  listen(WEBVIEW_SERVER_VERSION_UPDATED, async ({ payload: { url } }) => {
    const guestWebContents = getWebContentsByServerUrl(url);
    if (!guestWebContents || guestWebContents.isDestroyed()) {
      return;
    }
    try {
      await purgeWebClientCacheOnce(
        url,
        guestWebContents,
        readStateFile,
        writeStateFile
      );
    } catch (error) {
      loggers.e2eeSearch.warn('Old IndexedDB cache purge failed', error);
    }
  });
};
