import { createHash } from 'node:crypto';
import { readdir, rm, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { SearchHost } from './host';
import type { E2EESearchServerIndexStats, E2EESearchStats } from './types';

// The folder name of a server under the index root.
export const serverDirName = (serverUrl: string): string =>
  createHash('sha256').update(serverUrl).digest('hex');

// The folder name of a user under its server folder. Meteor ids are
// case-sensitive, but the disks of macOS and Windows are not, so a raw id
// lets user `ABC` overwrite the index of user `abc`. A hash is
// also never a Windows device name such as `CON`.
export const userDirName = (userId: string): string =>
  createHash('sha256').update(userId).digest('hex');

// The folder of the index of one user of one server.
export const indexDirOf = (
  rootDir: string,
  serverUrl: string,
  userId: string
): string => path.join(rootDir, serverDirName(serverUrl), userDirName(userId));

// A server removed from the desktop app leaves no index
// on disk. Each open index of the server is discarded first, so no pending
// or running snapshot save writes the folder again after the delete.
export const deleteServerIndexes = async (
  host: SearchHost,
  serverDir: string
): Promise<void> => {
  const prefix = serverDir + path.sep;
  await Promise.all(
    host
      .indexIds()
      .filter((indexId) => indexId.startsWith(prefix))
      .map((indexId) => host.discard(indexId))
  );
  await rm(serverDir, { recursive: true, force: true });
};

// Settings, "Clear local search index": every index of every server and user
// lives under the root folder. Each open index is discarded first, for the
// same reason as above. The web client fills the index again from the server.
export const deleteAllIndexes = async (
  host: SearchHost,
  rootDir: string
): Promise<void> => {
  await Promise.all(host.indexIds().map((indexId) => host.discard(indexId)));
  await rm(rootDir, { recursive: true, force: true });
};

const listDirs = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((e) => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

// The most user indexes that one server keeps. Only an index
// sealed by a wrap key from the user's E2EE private key stays next to the
// index of the confirmed user, so this bounds the disk that a page can fill
// with sealed indexes of made-up users.
export const MAX_USER_INDEXES_PER_SERVER = 4;

const mtimeOf = (dir: string): Promise<number> =>
  stat(dir).then(
    ({ mtimeMs }) => mtimeMs,
    () => 0
  );

// The server confirms who the logged-in user is, but a
// hostile server can confirm any user. So an open of a user deletes the
// indexes of the other users of the server, and a logout deletes the indexes
// of the server. Each open index is discarded first, so no pending or
// running save writes its folder again. This also stops a page that fills
// the disk with user folders.
// An index sealed by a wrap key from the user's
// E2EE private key is kept, because no page without that private key can
// open it. Its open index is closed with a save. At most
// MAX_USER_INDEXES_PER_SERVER user indexes stay, and the sealed index that
// was written longest ago goes first.
// The tasks of one server run one at a time, so two opens, or an open and a
// logout or a server removal, cannot pass each other.
// `isServerKnown` is false after the user removes the server. An open
// that runs after the removal is refused. An open that is running when the
// removal comes is refused when it ends, and the removal, queued after it,
// discards its index and deletes the folder.
export const createUserIndexLimiter = ({
  host,
  isServerKnown = () => true,
  isSealed = async () => false,
}: {
  host: Pick<SearchHost, 'indexIds' | 'discard' | 'close'>;
  isServerKnown?: (serverDir: string) => boolean;
  isSealed?: (indexDir: string) => Promise<boolean>;
}) => {
  const queues = new Map<string, Promise<unknown>>();

  const run = <T>(serverDir: string, task: () => Promise<T>): Promise<T> => {
    const previous = queues.get(serverDir) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    queues.set(serverDir, current);
    const cleanup = () => {
      if (queues.get(serverDir) === current) queues.delete(serverDir);
    };
    current.then(cleanup, cleanup);
    return current;
  };

  const deleteIndex = async (indexDir: string, open: boolean) => {
    if (open) await host.discard(indexDir);
    await rm(indexDir, { recursive: true, force: true });
  };

  // Deletes every user index of the server except `keepUserDir`, and keeps
  // the sealed ones when `keepSealed` is true. A memory-only index has no
  // folder, so the open indexes are read too.
  const deleteOtherUsers = async (
    serverDir: string,
    { keepUserDir, keepSealed }: { keepUserDir?: string; keepSealed: boolean }
  ): Promise<void> => {
    const prefix = serverDir + path.sep;
    const openUserDirs = new Set(
      host
        .indexIds()
        .filter((indexId) => indexId.startsWith(prefix))
        .map((indexId) => indexId.slice(prefix.length))
    );
    const userDirs = [
      ...new Set([...openUserDirs, ...(await listDirs(serverDir))]),
    ].filter((userDir) => userDir !== keepUserDir);

    const kept: string[] = [];
    await Promise.all(
      userDirs.map(async (userDir) => {
        const indexDir = path.join(serverDir, userDir);
        const open = openUserDirs.has(userDir);
        if (keepSealed && (await isSealed(indexDir))) {
          if (open) await host.close(indexDir);
          kept.push(indexDir);
          return;
        }
        await deleteIndex(indexDir, open);
      })
    );

    const room = MAX_USER_INDEXES_PER_SERVER - (keepUserDir ? 1 : 0);
    if (kept.length <= room) return;
    const ages = await Promise.all(kept.map(mtimeOf));
    const newestFirst = kept
      .map((indexDir, i) => ({ indexDir, mtime: ages[i] }))
      .sort((a, b) => b.mtime - a.mtime);
    await Promise.all(
      newestFirst
        .slice(room)
        .map(({ indexDir }) => deleteIndex(indexDir, false))
    );
  };

  const assertServerKnown = (serverDir: string) => {
    if (!isServerKnown(serverDir)) {
      throw new Error('E2EE search server was removed');
    }
  };

  return {
    // Call only after the server confirmed the user.
    admit<T>(
      serverDir: string,
      userDir: string,
      open: () => Promise<T>
    ): Promise<T> {
      return run(serverDir, async () => {
        assertServerKnown(serverDir);
        await deleteOtherUsers(serverDir, {
          keepUserDir: userDir,
          keepSealed: true,
        });
        const result = await open();
        assertServerKnown(serverDir);
        return result;
      });
    },
    // A logout of the server. The server folder goes too when no sealed
    // index is left in it.
    deleteUserIndexes: (serverDir: string): Promise<void> =>
      run(serverDir, async () => {
        await deleteOtherUsers(serverDir, { keepSealed: true });
        await rmdir(serverDir).catch(() => undefined);
      }),
    // A bridge wipe: E2E key reset, admin or user turned the
    // local search off. The key file goes with the snapshot, so the wrap key
    // of a new E2E key opens a new index, and no file of the old index stays.
    deleteUserIndex: (serverDir: string, indexDir: string): Promise<void> =>
      run(serverDir, () =>
        deleteIndex(indexDir, host.indexIds().includes(indexDir))
      ),
    // The user removed the server from the app.
    removeServer: (serverDir: string): Promise<void> =>
      run(serverDir, async () => {
        await deleteOtherUsers(serverDir, { keepSealed: false });
        await rm(serverDir, { recursive: true, force: true });
      }),
  };
};

const sizeOfFiles = async (dir: string): Promise<number> => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }
  const sizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        stat(path.join(dir, entry.name)).then(
          ({ size }) => size,
          () => 0
        )
      )
  );
  return sizes.reduce((sum, size) => sum + size, 0);
};

const atRestOf = (
  encrypted: boolean[]
): E2EESearchServerIndexStats['atRest'] => {
  if (encrypted.every(Boolean)) return 'encrypted';
  if (!encrypted.some(Boolean)) return 'memory-only';
  return 'mixed';
};

type CollectIndexStatsOptions = {
  host: SearchHost;
  rootDir: string;
  // The servers of the app, in sidebar order. A folder that matches none of
  // them is left by a server removed while the app was not running.
  serverUrls: string[];
  // The at-rest state that the worker returned when it opened the index.
  isEncryptedAtRest: (indexId: string) => boolean | undefined;
};

// Settings: one entry for each server folder on disk or with an open index.
// The message count comes only from open indexes, because a closed index is
// an encrypted snapshot that only its keychain key can read. A memory-only
// index writes nothing to disk, so it shows only while it is open.
export const collectIndexStats = async ({
  host,
  rootDir,
  serverUrls,
  isEncryptedAtRest,
}: CollectIndexStatsOptions): Promise<E2EESearchServerIndexStats[]> => {
  const users = new Map<string, Set<string>>();
  const addUser = (serverDir: string, userId: string) => {
    if (!users.has(serverDir)) users.set(serverDir, new Set());
    users.get(serverDir)?.add(userId);
  };

  const serverDirs = await listDirs(rootDir);
  const userDirs = await Promise.all(
    serverDirs.map((serverDir) => listDirs(path.join(rootDir, serverDir)))
  );
  serverDirs.forEach((serverDir, i) =>
    userDirs[i].forEach((userId) => addUser(serverDir, userId))
  );
  const openIds = new Set(host.indexIds());
  for (const indexId of openIds) {
    const relative = path.relative(rootDir, indexId).split(path.sep);
    if (relative.length === 2 && relative[0] !== '..') {
      addUser(relative[0], relative[1]);
    }
  }

  const urlByDir = new Map(serverUrls.map((url) => [serverDirName(url), url]));
  const order = (dir: string) => {
    const url = urlByDir.get(dir);
    return url === undefined ? serverUrls.length : serverUrls.indexOf(url);
  };

  const servers = [...users.keys()].sort((a, b) => order(a) - order(b));
  return Promise.all(
    servers.map(async (serverDir) => {
      const userIds = [...(users.get(serverDir) ?? [])];
      const perUser = await Promise.all(
        userIds.map(async (userId) => {
          const indexId = path.join(rootDir, serverDir, userId);
          const stats = openIds.has(indexId)
            ? ((await host.call(indexId, 'stats')) as E2EESearchStats)
            : undefined;
          return {
            docs: stats?.docs,
            bytes: await sizeOfFiles(indexId),
            // An index that is not open is on disk, and only a keychain key
            // writes to disk.
            encrypted: isEncryptedAtRest(indexId) ?? true,
          };
        })
      );
      const counted = perUser.filter((user) => user.docs !== undefined);
      return {
        serverUrl: urlByDir.get(serverDir),
        users: userIds.length,
        docs: counted.length
          ? counted.reduce((sum, user) => sum + (user.docs ?? 0), 0)
          : undefined,
        bytesOnDisk: perUser.reduce((sum, user) => sum + user.bytes, 0),
        atRest: atRestOf(perUser.map((user) => user.encrypted)),
      };
    })
  );
};
