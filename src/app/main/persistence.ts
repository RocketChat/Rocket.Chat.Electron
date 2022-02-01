import { app } from 'electron';
import ElectronStore from 'electron-store';

import { PersistableValues, migrations } from '../PersistableValues';

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

let lastSavedTime = 0;

export const persistValues = (values: PersistableValues): void => {
  if (Date.now() - lastSavedTime > 1000) {
    try {
      getElectronStore().set(values);
    } catch (error) {
      error instanceof Error && console.error(error);
    }
    lastSavedTime = Date.now();
  }
};
