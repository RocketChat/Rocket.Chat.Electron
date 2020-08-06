import Store from 'electron-store';

import appManifest from '../appManifest.json';

const migrations = {};

export const createElectronStore = (): Store =>
	new Store({
		migrations,
		projectVersion: appManifest.version,
	} as unknown as Store.Options<Record<string, unknown>>);
