import { fork, call, takeEvery, select } from 'redux-saga/effects';
import { createStructuredSelector } from 'reselect';

import { navigationEventsSaga } from './navigationEvents';
import { preferencesSaga } from './preferences';
import { serversSaga } from './servers';
import { spellCheckingSaga } from './spellChecking';
import { updatesSaga } from './updates';
import { mainWindowStateSaga } from './rootWindow';

export function *rootSaga() {
	yield call(mainWindowStateSaga);
	yield call(navigationEventsSaga);
	yield call(preferencesSaga);
	yield call(serversSaga);
	yield fork(spellCheckingSaga);
	yield call(updatesSaga);

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
			localStorage.setItem(key, JSON.stringify(value));
		}
	});
}
