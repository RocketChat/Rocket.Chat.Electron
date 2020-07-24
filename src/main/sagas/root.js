import { spawn } from 'redux-saga/effects';

import { setupDock } from '../ui/dock';
import { setupMenuBar } from '../ui/menuBar';
import { setupRootWindow } from '../ui/rootWindow';
import { setupTouchBar } from '../ui/touchBar';
import { setupTrayIcon } from '../ui/trayIcon';
import { waitForAppReady, setupApp } from '../app';
import { setupElectronStore, unlockAutoPersistenceOnElectronStore } from '../electronStore';
import { setupI18n } from '../i18n';
import { setupUpdates } from '../updates';
import { setupDeepLinks, processDeepLinksInArgs } from '../deepLinks';
import { setupNavigation } from '../navigation';
import { setupServers } from '../servers';
import { setupSpellChecking } from '../spellChecking';

export function *rootSaga() {
	yield *setupElectronStore();
	yield *waitForAppReady();
	yield *setupI18n();

	yield *setupRootWindow(function *(localStorage) {
		yield *setupServers(localStorage);
		yield *setupSpellChecking(localStorage);
	});

	yield *setupApp();
	yield *setupDeepLinks();
	yield *setupNavigation();
	yield *setupUpdates();

	yield spawn(setupDock);
	yield spawn(setupMenuBar);
	yield spawn(setupTouchBar);
	yield spawn(setupTrayIcon);

	yield *unlockAutoPersistenceOnElectronStore();

	yield *processDeepLinksInArgs();
}
