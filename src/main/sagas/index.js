import { spawn, call, take, takeEvery, select } from 'redux-saga/effects';
import { createStructuredSelector } from 'reselect';

import { dockSaga } from './dock';
import { trayIconSaga } from './trayIcon';
import { setupI18next } from '../../i18n';
import { appReadyChannel } from '../channels';
import { rootWindowSaga } from './rootWindow';
import { menuBarSaga } from './menuBar';
import { touchBarSaga } from './touchBar';
import { appSaga } from './app';
import { deepLinksSaga } from './deepLinks';
import { navigationSaga } from './navigation';
import { updatesSaga } from './updates';
import { spellCheckingSaga } from './spellChecking';
import { preferencesSaga } from './preferences';
import { serversSaga } from './servers';
import { writeToStorage } from '../localStorage';

export function *rootSaga() {
	yield take(appReadyChannel());
	yield call(setupI18next);

	const rootWindow = yield call(rootWindowSaga);

	yield spawn(appSaga, rootWindow);
	yield spawn(preferencesSaga, rootWindow);
	yield spawn(serversSaga, rootWindow);
	yield spawn(deepLinksSaga);
	yield spawn(navigationSaga, rootWindow);
	yield spawn(updatesSaga, rootWindow);
	yield spawn(spellCheckingSaga, rootWindow);
	yield spawn(menuBarSaga, rootWindow);
	yield spawn(touchBarSaga, rootWindow);
	yield spawn(dockSaga);
	yield spawn(trayIconSaga);

	const selectPersistableValues = createStructuredSelector({
		currentServerUrl: ({ currentServerUrl }) => currentServerUrl ?? null,
		doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup ?? true,
		isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled ?? true,
		isShowWindowOnUnreadChangedEnabled: ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled ?? false,
		isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled ?? true,
		isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true,
		mainWindowState: ({ mainWindowState }) => mainWindowState ?? {},
		servers: ({ servers }) => servers ?? [],
		skippedUpdateVersion: ({ skippedUpdateVersion }) => skippedUpdateVersion ?? null,
		trustedCertificates: ({ trustedCertificates }) => trustedCertificates ?? {},
	});

	yield takeEvery('*', function *() {
		const values = yield select(selectPersistableValues);
		for (const [key, value] of Object.entries(values)) {
			yield call(writeToStorage, rootWindow, key, value);
		}
	});
}
