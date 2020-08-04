import Store from 'electron-store';

import appManifest from '../../package.json';
import { selectPersistableValues } from './selectors';
import { PERSISTABLE_VALUES_MERGED } from '../actions';

const migrations = {};

export const createElectronStore = () =>
	new Store({
		migrations,
		projectVersion: appManifest.version,
	});

export let unlock = () => undefined;

const canWrite = new Promise((resolve) => {
	unlock = resolve;
});

export const mergePersistableValues = async (reduxStore, electronStore) => {
	const currentValues = selectPersistableValues(reduxStore.getState());

	const electronStoreValues = Object.fromEntries(Array.from(electronStore));

	const newValues = selectPersistableValues({
		...currentValues,
		...electronStoreValues,
	});

	reduxStore.dispatch({
		type: PERSISTABLE_VALUES_MERGED,
		payload: newValues,
	});

	await canWrite;

	reduxStore.subscribe(() => {
		const values = selectPersistableValues(reduxStore.getState());

		for (const [key, value] of Object.entries(values)) {
			electronStore.set(key, value);
		}
	});
};
