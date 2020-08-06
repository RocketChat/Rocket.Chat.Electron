import { app, ipcMain } from 'electron';

import { QUERY_APP_VERSION, QUERY_APP_PATH } from './ipc';
import { setupApp } from './main/app';
import { mergePersistableValues, watchAndPersistChanges } from './main/data';
import { setupDeepLinks, processDeepLinksInArgs } from './main/deepLinks';
import { setupElectronReloader, installDevTools } from './main/dev';
import { createElectronStore } from './main/electronStore';
import { setupI18n } from './main/i18n';
import { setupNavigation } from './main/navigation';
import { setupPowerMonitor } from './main/powerMonitor';
import { createReduxStore } from './main/reduxStore';
import { selectMainWindowState } from './main/selectors';
import { setupServers } from './main/servers';
import { setupSpellChecking } from './main/spellChecking';
import { performStartup } from './main/startup';
import { setupBrowserViews } from './main/ui/browserViews';
import { setupSideBarContextMenu } from './main/ui/contextMenus/sidebar';
import { setupDock } from './main/ui/dock';
import { setupMenuBar } from './main/ui/menuBar';
import { setupNotifications } from './main/ui/notifications';
import {
	setupRootWindow,
	createRootWindow,
	getLocalStorage,
	purgeLocalStorage,
	applyMainWindowState,
} from './main/ui/rootWindow';
import { setupTouchBar } from './main/ui/touchBar';
import { setupTrayIcon } from './main/ui/trayIcon';
import { setupUpdates } from './main/updates';

if (require.main === module) {
	performStartup();

	app.whenReady().then(async () => {
		const reduxStore = createReduxStore();
		const electronStore = createElectronStore();

		ipcMain.handle(QUERY_APP_VERSION, () => app.getVersion());
		ipcMain.handle(QUERY_APP_PATH, () => app.getAppPath());

		if (process.env.NODE_ENV === 'development') {
			await setupElectronReloader();
			await installDevTools();
		}

		await setupI18n();

		const rootWindow = await createRootWindow(reduxStore);

		const localStorage = await getLocalStorage(rootWindow);

		await mergePersistableValues(reduxStore, electronStore, localStorage);
		await setupServers(reduxStore, localStorage);
		await setupSpellChecking(reduxStore, localStorage);

		const rootWindowState = selectMainWindowState(reduxStore.getState());
		await applyMainWindowState(rootWindow, rootWindowState);

		await setupApp(reduxStore, rootWindow);
		await setupDeepLinks(reduxStore, rootWindow);
		await setupNavigation(reduxStore, rootWindow);
		await setupNotifications();
		await setupPowerMonitor();
		await setupUpdates(reduxStore, rootWindow);

		await setupBrowserViews(reduxStore, rootWindow);
		await setupDock(reduxStore);
		await setupMenuBar(reduxStore, rootWindow);
		await setupRootWindow(reduxStore, rootWindow);
		await setupSideBarContextMenu(reduxStore, rootWindow);
		await setupTouchBar(reduxStore, rootWindow);
		await setupTrayIcon(reduxStore, rootWindow);

		await purgeLocalStorage(rootWindow);
		await watchAndPersistChanges(reduxStore, electronStore);
		await processDeepLinksInArgs();
	});
}
