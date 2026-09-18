import { app } from 'electron';
import ElectronStore from 'electron-store';

import { loggers } from '../../logging/scopes';
import type { PersistableValues } from '../PersistableValues';
import { migrations } from '../PersistableValues';

/**
 * Codes seen when the atomic rename in `conf` fails on a UNC-backed roaming
 * profile. `conf` only falls back to a non-atomic write for EXDEV, so these
 * would otherwise escape and kill startup before any window exists.
 */
const NON_ATOMIC_FALLBACK_CODES = new Set([
  'UNKNOWN',
  'EPERM',
  'EBUSY',
  'EACCES',
  'EXDEV',
]);

const errorCodeOf = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;

const isNonAtomicFallbackError = (error: unknown): boolean => {
  const code = errorCodeOf(error);
  return code !== undefined && NON_ATOMIC_FALLBACK_CODES.has(code);
};

type StoreLike = Pick<
  ElectronStore<PersistableValues>,
  'store' | 'get' | 'set' | 'path'
>;

/**
 * Store used when the real one cannot be constructed at all. Keeps the app
 * usable for the session with in-memory values instead of exiting at startup.
 */
const createInMemoryStore = (): StoreLike => {
  let values: Partial<PersistableValues> = {};

  return {
    get store() {
      return values as PersistableValues;
    },
    set store(next: PersistableValues) {
      values = next;
    },
    path: '',
    get: ((key: keyof PersistableValues) => values[key]) as StoreLike['get'],
    set: ((keyOrValues: unknown, value?: unknown) => {
      if (typeof keyOrValues === 'string') {
        values = { ...values, [keyOrValues]: value };
        return;
      }
      values = { ...values, ...(keyOrValues as Partial<PersistableValues>) };
    }) as StoreLike['set'],
  };
};

let electronStore: StoreLike | undefined;
let usingInMemoryStore = false;
let usingNonAtomicWrites = false;

/**
 * Runs `operation` with conf's non-atomic write path enabled. conf gates that
 * path on SNAP, so it is set for the duration of the call and restored after.
 */
const withoutAtomicWrites = <T>(operation: () => T): T => {
  const previous = process.env.SNAP;
  process.env.SNAP = previous ?? '1';
  try {
    return operation();
  } finally {
    if (previous === undefined) {
      delete process.env.SNAP;
    } else {
      process.env.SNAP = previous;
    }
  }
};

const createElectronStore = (): ElectronStore<PersistableValues> =>
  new ElectronStore<PersistableValues>({
    migrations: Object.fromEntries(
      Object.entries(migrations).map(([semver, transform]) => [
        semver,
        (store: { store: PersistableValues }) => {
          store.store = transform(store.store as any) as any;
        },
      ])
    ),
    projectVersion: app.getVersion(),
    configFileMode: 0o666,
  } as ElectronStore.Options<PersistableValues>);

const getElectronStore = (): StoreLike => {
  if (electronStore) {
    return electronStore;
  }

  try {
    electronStore = createElectronStore();
    return electronStore;
  } catch (error) {
    if (!isNonAtomicFallbackError(error)) {
      loggers.persistence.error('Failed to open the settings store', error);
      usingInMemoryStore = true;
      electronStore = createInMemoryStore();
      return electronStore;
    }

    loggers.persistence.warn(
      'Atomic write of the settings store failed; retrying without atomic rename',
      error
    );
  }

  // Every conf write — including the migration marker that just failed — goes
  // through the same atomic rename, so reopening the store only works once that
  // rename is out of the way. conf skips it entirely when SNAP is set, which is
  // the escape hatch it already ships for filesystems where renaming fails.
  try {
    electronStore = withoutAtomicWrites(createElectronStore);
    usingNonAtomicWrites = true;
    loggers.persistence.info(
      'Recovered the settings store using non-atomic writes'
    );
    return electronStore;
  } catch (error) {
    loggers.persistence.error(
      'Could not recover the settings store; continuing with in-memory settings',
      error
    );
    usingInMemoryStore = true;
    electronStore = createInMemoryStore();
    return electronStore;
  }
};

/** True when settings could not be loaded and will not survive a restart. */
export const isUsingInMemorySettings = (): boolean => usingInMemoryStore;

export const getPersistedValues = (): PersistableValues =>
  getElectronStore().store;

/** Read a store key that is not necessarily mirrored in Redux. */
export const getPersistedMeta = <T>(key: string, fallback: T): T => {
  const value = getElectronStore().get(key as keyof PersistableValues);
  return (value as T | undefined) ?? fallback;
};

/**
 * Retry a store write without the atomic rename when that rename is what
 * failed, so settings still reach disk on UNC-backed roaming profiles.
 */
const writeThroughFallback = (
  error: unknown,
  context: string,
  write: () => void
): void => {
  if (!isNonAtomicFallbackError(error)) {
    loggers.persistence.error(`Failed to save settings (${context})`, error);
    return;
  }

  try {
    withoutAtomicWrites(write);
    usingNonAtomicWrites = true;
    loggers.persistence.warn(
      `Saved settings without atomic rename (${context})`,
      errorCodeOf(error)
    );
  } catch (fallbackError) {
    loggers.persistence.error(
      `Failed to save settings (${context})`,
      fallbackError
    );
  }
};

/** Runs a store write, retrying without the atomic rename when it fails. */
const writeToStore = (context: string, write: () => void): void => {
  if (usingNonAtomicWrites) {
    try {
      withoutAtomicWrites(write);
    } catch (error) {
      loggers.persistence.error(`Failed to save settings (${context})`, error);
    }
    return;
  }

  try {
    write();
  } catch (error) {
    writeThroughFallback(error, context, write);
  }
};

/** Write a store key without replacing the rest of the config. */
export const setPersistedMeta = (key: string, value: unknown): void => {
  writeToStore(`meta:${key}`, () => {
    getElectronStore().set(key as keyof PersistableValues, value as never);
  });
};

const THROTTLE_INTERVAL_MS = 1000;

let lastSavedTime = 0;
let pendingValues: PersistableValues | null = null;
let trailingTimeout: ReturnType<typeof setTimeout> | null = null;

const writeNow = (values: PersistableValues): void => {
  writeToStore('values', () => {
    getElectronStore().set(values);
  });
  lastSavedTime = Date.now();
};

const scheduleTrailingSave = (delay: number): void => {
  if (trailingTimeout) {
    return;
  }

  trailingTimeout = setTimeout(() => {
    trailingTimeout = null;
    if (pendingValues) {
      const values = pendingValues;
      pendingValues = null;
      writeNow(values);
    }
  }, delay);
};

export const persistValues = (values: PersistableValues): void => {
  const elapsed = Date.now() - lastSavedTime;

  if (elapsed >= THROTTLE_INTERVAL_MS) {
    pendingValues = null;
    writeNow(values);
    return;
  }

  pendingValues = values;
  scheduleTrailingSave(THROTTLE_INTERVAL_MS - elapsed);
};

/** Synchronously flush any pending trailing write, e.g. before app quit. */
export const flushPersistedValues = (): void => {
  if (trailingTimeout) {
    clearTimeout(trailingTimeout);
    trailingTimeout = null;
  }

  if (pendingValues) {
    const values = pendingValues;
    pendingValues = null;
    writeNow(values);
  }
};
