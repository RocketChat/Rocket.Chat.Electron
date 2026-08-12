import { app } from 'electron';
import ElectronStore from 'electron-store';

import type { PersistableValues } from '../PersistableValues';
import { migrations } from '../PersistableValues';

let electronStore: ElectronStore<PersistableValues>;

const getElectronStore = (): ElectronStore<PersistableValues> => {
  if (!electronStore) {
    electronStore = new ElectronStore<PersistableValues>({
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
  }

  return electronStore;
};

export const getPersistedValues = (): PersistableValues =>
  getElectronStore().store;

/** Read a store key that is not necessarily mirrored in Redux. */
export const getPersistedMeta = <T>(key: string, fallback: T): T => {
  const value = getElectronStore().get(key as keyof PersistableValues);
  return (value as T | undefined) ?? fallback;
};

/** Write a store key without replacing the rest of the config. */
export const setPersistedMeta = (key: string, value: unknown): void => {
  try {
    getElectronStore().set(key as keyof PersistableValues, value as never);
  } catch (error) {
    error instanceof Error && console.error(error);
  }
};

const THROTTLE_INTERVAL_MS = 1000;

let lastSavedTime = 0;
let pendingValues: PersistableValues | null = null;
let trailingTimeout: ReturnType<typeof setTimeout> | null = null;

const writeNow = (values: PersistableValues): void => {
  try {
    getElectronStore().set(values);
  } catch (error) {
    error instanceof Error && console.error(error);
  }
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
