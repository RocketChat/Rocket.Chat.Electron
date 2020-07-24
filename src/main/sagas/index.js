import { spawn, call, setContext } from 'redux-saga/effects';

import { setupDock } from '../ui/dock';
import { setupMenuBar } from '../ui/menuBar';
import { setupTouchBar } from '../ui/touchBar';
import { setupTrayIcon } from '../ui/trayIcon';
import { setupElectronStore, unlockAutoPersistenceOnElectronStore } from '../electronStore';
import { setupI18next } from '../i18n';
import { waitForAppReady, watchApp } from './app';
import { takeEveryForDeepLinks, processDeepLinksInArgs } from './deepLinks';
import { takeEveryForNavigation, loadNavigationConfiguration } from './navigation';
import { rootWindowSaga, applyMainWindowState, setupRootWindow, consumeLocalStorage } from './rootWindow';
import { loadServersConfiguration } from './servers';
import { spellCheckingSaga, loadSpellCheckingConfiguration } from './spellChecking';
import { updatesSaga, loadUpdatesConfiguration } from './updates';

export function *rootSaga({ reduxStore }) {
	yield setContext({ reduxStore });

	yield *setupElectronStore();
	yield *waitForAppReady();
	yield call(setupI18next);

	yield *setupRootWindow();

	yield *consumeLocalStorage(function *(localStorage) {
		yield *loadServersConfiguration(localStorage);
		yield *loadNavigationConfiguration(localStorage);
		yield *loadSpellCheckingConfiguration(localStorage);
		yield *loadUpdatesConfiguration(localStorage);
	});

	yield *applyMainWindowState();

	yield spawn(watchApp);
	yield spawn(takeEveryForDeepLinks);
	yield spawn(takeEveryForNavigation);
	yield spawn(updatesSaga);
	yield spawn(spellCheckingSaga);
	yield spawn(rootWindowSaga);

	yield spawn(setupDock);
	yield spawn(setupMenuBar);
	yield spawn(setupTouchBar);
	yield spawn(setupTrayIcon);

	yield *unlockAutoPersistenceOnElectronStore();

	yield *processDeepLinksInArgs();
}
