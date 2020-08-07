import { app } from 'electron';

import {
	APP_PATH_SET,
	APP_VERSION_SET,
} from './actions';
import { setupApp } from './main/app';
import { mergePersistableValues, watchAndPersistChanges, getLocalStorage, purgeLocalStorage } from './main/data';
import { setupDeepLinks, processDeepLinksInArgs } from './main/deepLinks';
import { setupElectronReloader, installDevTools } from './main/dev';
import { createElectronStore } from './main/electronStore';
import { setupI18n } from './main/i18n';
import { setupNavigation } from './main/navigation';
import { setupPowerMonitor } from './main/powerMonitor';
import { createReduxStore } from './main/reduxStore';
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
	applyMainWindowState,
} from './main/ui/rootWindow';
import { setupTouchBar } from './main/ui/touchBar';
import { setupTrayIcon } from './main/ui/trayIcon';
import { setupUpdates } from './main/updates';
import { selectMainWindowState } from './selectors';

if (require.main === module) {
	performStartup();

	const reduxStore = createReduxStore();
	const electronStore = createElectronStore();

	app.whenReady().then(async () => {
		reduxStore.dispatch({ type: APP_PATH_SET, payload: app.getAppPath() });
		reduxStore.dispatch({ type: APP_VERSION_SET, payload: app.getVersion() });

		if (process.env.NODE_ENV === 'development') {
			await setupElectronReloader();
			await installDevTools();
		}

		await setupI18n();

		const rootWindow = await createRootWindow(reduxStore);

		const localStorage = await getLocalStorage(rootWindow.webContents);

		await mergePersistableValues(reduxStore, electronStore, localStorage);
		await setupServers(reduxStore, localStorage);
		await setupSpellChecking(reduxStore, localStorage);

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

		const rootWindowState = selectMainWindowState(reduxStore.getState());
		await applyMainWindowState(rootWindow, rootWindowState);

		await purgeLocalStorage(rootWindow.webContents);
		await watchAndPersistChanges(reduxStore, electronStore);
		await processDeepLinksInArgs();
	});
}
