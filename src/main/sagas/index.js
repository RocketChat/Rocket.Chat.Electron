import { spawn, call, takeEvery, select, getContext, put } from 'redux-saga/effects';

import { takeEveryForApp } from './app';
import { takeEveryForDeepLinks, processDeepLinksInArgs } from './deepLinks';
import { handleDock } from './dock';
import { handleMenuBar } from './menuBar';
import { takeEveryForNavigation, migrateTrustedCertificates } from './navigation';
import { migratePreferences } from './preferences';
import { rootWindowSaga, migrateRootWindowState, applyMainWindowState } from './rootWindow';
import { migrateServers } from './servers';
import { spellCheckingSaga } from './spellChecking';
import { handleTouchBar } from './touchBar';
import { handleTrayIcon } from './trayIcon';
import { updatesSaga } from './updates';
import { selectPersistableValues } from '../selectors';
import { PREFERENCES_READY, CERTIFICATES_READY, SERVERS_READY } from '../../actions';

export function *rootSaga() {
	const rootWindow = yield getContext('rootWindow');
	const electronStore = yield getContext('electronStore');

	const defaultValues = yield select(selectPersistableValues);

	const localStorage = yield call(() => rootWindow.webContents.executeJavaScript('({...localStorage})'));
	const localStorageValues = Object.fromEntries(
		Object.entries(localStorage)
			.map(([key, value]) => {
				try {
					return [key, JSON.parse(value)];
				} catch (error) {
					return [];
				}
			}),
	);

	const electronStoreValues = Object.fromEntries(Array.from(electronStore));

	const persistedValues = selectPersistableValues({
		...defaultValues,
		...localStorageValues,
		...electronStoreValues,
	});

	yield call(migratePreferences, persistedValues, localStorage);
	yield call(migrateServers, persistedValues, localStorage);
	yield call(migrateTrustedCertificates, persistedValues);
	yield call(migrateRootWindowState, persistedValues);

	yield put({
		type: PREFERENCES_READY,
		payload: {
			isMenuBarEnabled: persistedValues.isMenuBarEnabled,
			isShowWindowOnUnreadChangedEnabled: persistedValues.isShowWindowOnUnreadChangedEnabled,
			isSideBarEnabled: persistedValues.isSideBarEnabled,
			isTrayIconEnabled: persistedValues.isTrayIconEnabled,
		},
	});

	yield put({
		type: CERTIFICATES_READY,
		payload: persistedValues.trustedCertificates,
	});

	yield put({
		type: SERVERS_READY,
		payload: {
			servers: persistedValues.servers,
			currentServerUrl: persistedValues.currentServerUrl,
		},
	});

	yield call(() => rootWindow.webContents.executeJavaScript('localStorage.clear()'));

	yield *applyMainWindowState(persistedValues.mainWindowState);

	yield spawn(takeEveryForApp);
	yield spawn(takeEveryForDeepLinks);
	yield spawn(takeEveryForNavigation);
	yield spawn(rootWindowSaga, rootWindow);
	yield spawn(updatesSaga, rootWindow);
	yield spawn(spellCheckingSaga, rootWindow);

	yield spawn(handleDock);
	yield spawn(handleMenuBar);
	yield spawn(handleTouchBar);
	yield spawn(handleTrayIcon);

	yield takeEvery('*', function *() {
		const values = yield select(selectPersistableValues);
		for (const [key, value] of Object.entries(values)) {
			electronStore.set(key, value);
		}
	});

	yield call(processDeepLinksInArgs);
}
