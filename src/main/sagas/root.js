import { spawn, call } from 'redux-saga/effects';
import { app } from 'electron';

import { setupBrowserViews } from '../ui/browserViews';
import { setupDock } from '../ui/dock';
import { setupMenuBar } from '../ui/menuBar';
import { setupNotifications } from '../ui/notifications';
import { setupRootWindow } from '../ui/rootWindow';
import { setupTouchBar } from '../ui/touchBar';
import { setupTrayIcon } from '../ui/trayIcon';
import { setupApp } from '../app';
import { unlock } from '../electronStore';
import { setupUpdates } from '../updates';
import { setupDeepLinks, processDeepLinksInArgs } from '../deepLinks';
import { setupNavigation } from '../navigation';
import { setupServers } from '../servers';
import { setupSpellChecking } from '../spellChecking';
import { setupPowerMonitor } from '../powerMonitor';

export function *rootSaga() {
	yield call(app.whenReady);

	yield *setupRootWindow(function *(localStorage) {
		yield *setupServers(localStorage);
		yield *setupSpellChecking(localStorage);
	});

	yield *setupApp();
	yield *setupDeepLinks();
	yield *setupNavigation();
	yield *setupUpdates();
	yield *setupPowerMonitor();

	yield spawn(setupBrowserViews);
	yield spawn(setupDock);
	yield spawn(setupMenuBar);
	yield spawn(setupNotifications);
	yield spawn(setupTouchBar);
	yield spawn(setupTrayIcon);

	yield call(unlock, true);

	yield *processDeepLinksInArgs();
}
