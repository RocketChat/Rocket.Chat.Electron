import { app, BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';
import { Store } from 'redux';
import { call, put, Effect } from 'redux-saga/effects';

import {
	APP_PATH_SET,
	APP_VERSION_SET,
} from '../actions';
import { takeRequests } from '../channels';
import { selectMainWindowState } from '../selectors';
import { setupApp, takeAppActions } from './app';
import { getLocalStorage, mergePersistableValues, purgeLocalStorage, watchAndPersistChanges } from './data';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks';
import { setupElectronReloader, installDevTools } from './dev';
import { createElectronStore } from './electronStore';
import { setupI18n, takeI18nActions } from './i18n';
import { setupNavigation } from './navigation';
import { setupPowerMonitor, takeSystemActions } from './powerMonitor';
import { takeScreenSharingActions } from './screenSharing';
import { setupServers, takeServersActions } from './servers';
import { setupSpellChecking, takeSpellCheckingActions } from './spellChecking';
import { setupDock } from './ui/dock';
import { setupMenuBar } from './ui/menuBar';
import { takeNotificationsActions } from './ui/notifications';
import { createRootWindow, setupRootWindow, applyMainWindowState, takeUiActions } from './ui/rootWindow';
import { setupTouchBar } from './ui/touchBar';
import { setupTrayIcon } from './ui/trayIcon';
import { setupUpdates, takeUpdateActions } from './updates';


export function *rootSaga(reduxStore: Store): Generator<Effect> {
	yield *takeRequests();
	yield *takeAppActions();
	yield *takeServersActions();
	yield *takeScreenSharingActions();
	yield *takeSystemActions();
	yield *takeSpellCheckingActions();
	yield *takeI18nActions();
	yield *takeNotificationsActions();

	yield put({ type: APP_PATH_SET, payload: app.getAppPath() });
	yield put({ type: APP_VERSION_SET, payload: app.getVersion() });

	const electronStore = (yield call(() => createElectronStore())) as ElectronStore;

	yield call(() => app.whenReady());

	if (process.env.NODE_ENV === 'development') {
		yield call(async () => {
			await setupElectronReloader();
			await installDevTools();
		});
	}

	yield call(async () => {
		await setupI18n();
	});

	const rootWindow = (yield call(() => createRootWindow(reduxStore))) as BrowserWindow;

	yield call(async () => {
		const localStorage = await getLocalStorage(rootWindow.webContents);

		await mergePersistableValues(reduxStore, electronStore, localStorage);
		await setupServers(reduxStore, localStorage);
		await setupSpellChecking(reduxStore, localStorage);

		setupApp(reduxStore, rootWindow);
		setupDeepLinks(reduxStore, rootWindow);
		await setupNavigation(reduxStore, rootWindow);
		setupPowerMonitor();
		await setupUpdates(reduxStore, rootWindow);

		setupDock(reduxStore);
		setupMenuBar(reduxStore, rootWindow);
		setupRootWindow(reduxStore, rootWindow);
		setupTouchBar(reduxStore, rootWindow);
		setupTrayIcon(reduxStore, rootWindow);

		const rootWindowState = selectMainWindowState(reduxStore.getState());
		applyMainWindowState(rootWindow, rootWindowState);

		await purgeLocalStorage(rootWindow.webContents);
		watchAndPersistChanges(reduxStore, electronStore);
	});

	yield *takeUpdateActions(rootWindow);
	yield *takeUiActions(rootWindow);

	yield call(() => processDeepLinksInArgs());
}
