import ElectronStore from 'electron-store';

import appManifest from '../../package.json';

const migrations = {};

export const createElectronStore = (): ElectronStore =>
  new ElectronStore({
    migrations,
    projectVersion: appManifest.version,
  } as unknown as ElectronStore.Options<Record<string, unknown>>);
