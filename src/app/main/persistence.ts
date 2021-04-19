import ElectronStore from 'electron-store';

import appManifest from '../../../package.json';
import { selectPersistableValues } from '../selectors';

type PersistableValues = ReturnType<typeof selectPersistableValues>;

const migrations = {
  '>=3.1.0': (store: ElectronStore<PersistableValues & { currentServerUrl: string }>) => {
    if (!store.has('currentServerUrl')) {
      return;
    }

    const currentServerUrl = store.get('currentServerUrl');
    store.set('currentView', currentServerUrl ? { url: currentServerUrl } : 'add-new-server');
    store.delete('currentServerUrl');
  },
};

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
