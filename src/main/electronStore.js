import Store from 'electron-store';
import { call, setContext, takeEvery, select, fork, take, put } from 'redux-saga/effects';

import appManifest from '../../package.json';
import { selectPersistableValues } from './selectors';
import { ELECTRON_STORE_READY_TO_PERSIST } from '../actions';

const migrations = {};

export const createElectronStore = () =>
	new Store({
		migrations,
		projectVersion: appManifest.version,
	});

function *watchUpdates(electronStore) {
	yield take(ELECTRON_STORE_READY_TO_PERSIST);

	yield takeEvery('*', function *() {
		const values = yield select(selectPersistableValues);

		for (const [key, value] of Object.entries(values)) {
			electronStore.set(key, value);
		}
	});
}

export function *setupElectronStore() {
	const electronStore = yield call(createElectronStore);
	yield setContext({ electronStore });

	yield fork(watchUpdates, electronStore);
}

export function *unlockAutoPersistenceOnElectronStore() {
	yield put({ type: ELECTRON_STORE_READY_TO_PERSIST });
}
