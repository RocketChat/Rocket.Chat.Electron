import { spawn, call, select, put, setContext, getContext } from 'redux-saga/effects';

import {
	PREFERENCES_READY,
	CERTIFICATES_READY,
	SERVERS_READY,
} from '../../actions';
import { setupDock } from '../ui/dock';
import { setupMenuBar } from '../ui/menuBar';
import { setupTouchBar } from '../ui/touchBar';
import { setupTrayIcon } from '../ui/trayIcon';
import { setupElectronStore, unlockAutoPersistenceOnElectronStore } from '../electronStore';
import { setupI18next } from '../i18n';
import { selectPersistableValues } from '../selectors';
import { waitForAppReady, watchApp } from './app';
import { takeEveryForDeepLinks, processDeepLinksInArgs } from './deepLinks';
import { takeEveryForNavigation, migrateTrustedCertificates } from './navigation';
import { rootWindowSaga, migrateRootWindowState, applyMainWindowState, migratePreferences, setupRootWindow } from './rootWindow';
import { migrateServers } from './servers';
import { spellCheckingSaga } from './spellChecking';
import { updatesSaga } from './updates';

export function *rootSaga({ reduxStore }) {
	yield setContext({ reduxStore });

	yield *setupElectronStore();
	yield *waitForAppReady();
	yield call(setupI18next);

	yield *setupRootWindow();

	const rootWindow = yield getContext('rootWindow');

	const defaultValues = yield select(selectPersistableValues);

	const electronStoreValues = Object.fromEntries(Array.from(yield getContext('electronStore')));

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

	const persistedValues = selectPersistableValues({
		...defaultValues,
		...electronStoreValues,
		...localStorageValues,
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

	yield spawn(watchApp);
	yield spawn(takeEveryForDeepLinks);
	yield spawn(takeEveryForNavigation);
	yield spawn(rootWindowSaga, rootWindow);
	yield spawn(updatesSaga, rootWindow);
	yield spawn(spellCheckingSaga, rootWindow);

	yield spawn(setupDock);
	yield spawn(setupMenuBar);
	yield spawn(setupTouchBar);
	yield spawn(setupTrayIcon);

	yield *unlockAutoPersistenceOnElectronStore();

	yield *processDeepLinksInArgs();
}
