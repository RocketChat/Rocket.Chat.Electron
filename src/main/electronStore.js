import Store from 'electron-store';

import appManifest from '../../package.json';

const migrations = {};

export const createElectronStore = () =>
	new Store({
		migrations,
		projectVersion: appManifest.version,
	});
