import { spawn, call, take, takeEvery, select } from 'redux-saga/effects';
import { createStructuredSelector } from 'reselect';

import { appReadyChannel } from '../channels';
import { writeToStorage } from '../localStorage';
import { appSaga } from './app';
import { deepLinksSaga } from './deepLinks';
import { dockSaga } from './dock';
import { menuBarSaga } from './menuBar';
import { navigationSaga } from './navigation';
import { preferencesSaga } from './preferences';
import { rootWindowSaga } from './rootWindow';
import { serversSaga } from './servers';
import { setupI18next } from '../../i18n';
import { spellCheckingSaga } from './spellChecking';
import { touchBarSaga } from './touchBar';
import { trayIconSaga } from './trayIcon';
import { updatesSaga } from './updates';

export function *rootSaga() {
	yield take(appReadyChannel());
	yield call(setupI18next);

	const rootWindow = yield call(rootWindowSaga);

	yield spawn(appSaga, rootWindow);
	yield spawn(preferencesSaga, rootWindow);
	yield spawn(serversSaga, rootWindow);
	yield spawn(deepLinksSaga, rootWindow);
	yield spawn(navigationSaga, rootWindow);
	yield spawn(updatesSaga, rootWindow);
	yield spawn(spellCheckingSaga, rootWindow);
	yield spawn(menuBarSaga, rootWindow);
	yield spawn(touchBarSaga, rootWindow);
	yield spawn(dockSaga, rootWindow);
	yield spawn(trayIconSaga, rootWindow);

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
