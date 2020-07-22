import Store from 'electron-store';

const migrations = {};

export const createElectronStore = () =>
	new Store({ migrations });
