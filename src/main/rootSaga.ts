import { app } from 'electron';
import { Store } from 'redux';
import { call, put, Effect } from 'redux-saga/effects';

import {
	APP_PATH_SET,
	APP_VERSION_SET,
} from '../actions';
import { selectMainWindowState } from '../selectors';
import { setupApp } from './app';
import { getLocalStorage, mergePersistableValues, purgeLocalStorage, watchAndPersistChanges } from './data';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks';
import { setupElectronReloader, installDevTools } from './dev';
import { createElectronStore } from './electronStore';
import { setupI18n } from './i18n';
import { setupNavigation } from './navigation';
import { setupPowerMonitor } from './powerMonitor';
import { setupServers } from './servers';
import { setupSpellChecking } from './spellChecking';
import { setupBrowserViews } from './ui/browserViews';
import { setupSideBarContextMenu } from './ui/contextMenus/sidebar';
import { setupDock } from './ui/dock';
import { setupMenuBar } from './ui/menuBar';
import { setupNotifications } from './ui/notifications';
import { createRootWindow, setupRootWindow, applyMainWindowState } from './ui/rootWindow';
import { setupTouchBar } from './ui/touchBar';
import { setupTrayIcon } from './ui/trayIcon';
import { setupUpdates } from './updates';

export function *rootSaga(reduxStore: Store): Generator<Effect> {
	yield put({ type: APP_PATH_SET, payload: app.getAppPath() });
	yield put({ type: APP_VERSION_SET, payload: app.getVersion() });

	const electronStore = yield call(() => createElectronStore());

	yield call(() => app.whenReady());

	if (process.env.NODE_ENV === 'development') {
		yield call(async () => {
			await setupElectronReloader();
			await installDevTools();
		});
	}

	yield call(async () => {
		await setupI18n();

		const rootWindow = await createRootWindow(reduxStore);

		const localStorage = await getLocalStorage(rootWindow.webContents);

		await mergePersistableValues(reduxStore, electronStore, localStorage);
		await setupServers(reduxStore, localStorage);
		await setupSpellChecking(reduxStore, localStorage);

		setupApp(reduxStore, rootWindow);
		setupDeepLinks(reduxStore, rootWindow);
		await setupNavigation(reduxStore, rootWindow);
		setupNotifications();
		setupPowerMonitor();
		await setupUpdates(reduxStore, rootWindow);

		setupBrowserViews(reduxStore, rootWindow);
		setupDock(reduxStore);
		setupMenuBar(reduxStore, rootWindow);
		setupRootWindow(reduxStore, rootWindow);
		setupSideBarContextMenu(reduxStore, rootWindow);
		setupTouchBar(reduxStore, rootWindow);
		setupTrayIcon(reduxStore, rootWindow);

		const rootWindowState = selectMainWindowState(reduxStore.getState());
		applyMainWindowState(rootWindow, rootWindowState);

		await purgeLocalStorage(rootWindow.webContents);
		watchAndPersistChanges(reduxStore, electronStore);
		await processDeepLinksInArgs();
	});
}
