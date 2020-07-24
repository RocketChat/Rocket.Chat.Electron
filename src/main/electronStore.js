import Store from 'electron-store';
import { call, setContext, takeEvery, select, fork, take, put } from 'redux-saga/effects';

import appManifest from '../../package.json';
import { selectPersistableValues } from './selectors';
import { PERSISTABLE_VALUES_READY, PERSISTABLE_VALUES_MERGED } from '../actions';

const migrations = {};

export const createElectronStore = () =>
	new Store({
		migrations,
		projectVersion: appManifest.version,
	});

function *watchUpdates(electronStore) {
	yield take(PERSISTABLE_VALUES_READY);

	yield takeEvery('*', function *() {
		const values = yield select(selectPersistableValues);

		for (const [key, value] of Object.entries(values)) {
			electronStore.set(key, value);
		}
	});
}

function *mergePersistableValues(electronStore) {
	const currentValues = yield select(selectPersistableValues);

	const electronStoreValues = Object.fromEntries(Array.from(electronStore));

	const newValues = selectPersistableValues({
		...currentValues,
		...electronStoreValues,
	});

	yield put({
		type: PERSISTABLE_VALUES_MERGED,
		payload: newValues,
	});
}

export function *setupElectronStore() {
	const electronStore = yield call(createElectronStore);
	yield setContext({ electronStore });

	yield *mergePersistableValues(electronStore);

	yield fork(watchUpdates, electronStore);
}

export function *unlockAutoPersistenceOnElectronStore() {
	yield put({ type: PERSISTABLE_VALUES_READY });
}
