import ElectronStore from 'electron-store';

import appManifest from '../../../package.json';
import { selectPersistableValues } from '../selectors';

type PersistableValues = ReturnType<typeof selectPersistableValues>;

const migrations = {};

let electronStore: ElectronStore<PersistableValues>;

const getElectronStore = (): ElectronStore<PersistableValues> => {
  if (!electronStore) {
    electronStore = new ElectronStore({
      migrations,
      projectVersion: appManifest.version,
    } as ElectronStore.Options<PersistableValues>);
  }

  return electronStore;
};

export const getPersistedValues = (): PersistableValues =>
  getElectronStore().store;

export const persistValues = (values: PersistableValues): void => {
  getElectronStore().set(values);
};
