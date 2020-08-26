import ElectronStore from 'electron-store';

import appManifest from '../../package.json';

const migrations = {};

let electronStore: ElectronStore;

export const getElectronStore = (): ElectronStore =>
  electronStore;

export const createElectronStore = (): void => {
  electronStore = new ElectronStore({
    migrations,
    projectVersion: appManifest.version,
  } as unknown as ElectronStore.Options<Record<string, unknown>>);
};
