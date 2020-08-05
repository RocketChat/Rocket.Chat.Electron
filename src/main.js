import { app } from 'electron';

import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { performStartup, setupApp } from './main/app';
import { createReduxStore } from './main/reduxStore';
import { setupI18n } from './main/i18n';
import { createElectronStore, mergePersistableValues, watchAndPersistChanges } from './main/electronStore';
import {
	setupRootWindow,
	createRootWindow,
	getLocalStorage,
	purgeLocalStorage,
	applyMainWindowState,
} from './main/ui/rootWindow';
import { setupServers } from './main/servers';
import { setupSpellChecking } from './main/spellChecking';
import { setupDeepLinks, processDeepLinksInArgs } from './main/deepLinks';
import { setupNavigation } from './main/navigation';
import { setupUpdates } from './main/updates';
import { setupPowerMonitor } from './main/powerMonitor';
import { setupBrowserViews } from './main/ui/browserViews';
import { setupDock } from './main/ui/dock';
import { setupMenuBar } from './main/ui/menuBar';
import { setupNotifications } from './main/ui/notifications';
import { setupTouchBar } from './main/ui/touchBar';
import { setupTrayIcon } from './main/ui/trayIcon';
import { selectMainWindowState } from './main/selectors';
import { setupSideBarContextMenu } from './main/ui/contextMenus/sidebar';
import { setupBrowserViewsContextMenu } from './main/ui/contextMenus/webview';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	performStartup();

	const reduxStore = createReduxStore();
	const electronStore = createElectronStore();

	app.whenReady().then(async () => {
		await setupI18n();

		const rootWindow = await createRootWindow();

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
		await setupUpdates(reduxStore);

		await setupBrowserViews(reduxStore, rootWindow);
		await setupBrowserViewsContextMenu(reduxStore, rootWindow);
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
