import { spawn } from 'redux-saga/effects';

import { setupDock } from '../ui/dock';
import { setupMenuBar } from '../ui/menuBar';
import { setupRootWindow } from '../ui/rootWindow';
import { setupTouchBar } from '../ui/touchBar';
import { setupTrayIcon } from '../ui/trayIcon';
import { setupElectronStore, unlockAutoPersistenceOnElectronStore } from '../electronStore';
import { setupI18n } from '../i18n';
import { waitForAppReady, watchAppActions } from './app';
import { watchDeepLinksActions, processDeepLinksInArgs } from './deepLinks';
import { watchNavigationActions, loadNavigationConfiguration } from './navigation';
import { loadServersConfiguration } from './servers';
import { watchSpellCheckingActions, loadSpellCheckingConfiguration } from './spellChecking';
import { setupUpdates } from '../updates';

export function *rootSaga() {
	yield *setupElectronStore();
	yield *waitForAppReady();
	yield *setupI18n();

	yield *setupRootWindow(function *(localStorage) {
		yield *loadServersConfiguration(localStorage);
		yield *loadSpellCheckingConfiguration(localStorage);
	});

	yield *loadNavigationConfiguration();
	yield *setupUpdates();

	yield spawn(setupDock);
	yield spawn(setupMenuBar);
	yield spawn(setupTouchBar);
	yield spawn(setupTrayIcon);

	yield spawn(watchAppActions);
	yield spawn(watchDeepLinksActions);
	yield spawn(watchNavigationActions);
	yield spawn(watchSpellCheckingActions);

	yield *unlockAutoPersistenceOnElectronStore();

	yield *processDeepLinksInArgs();
}
