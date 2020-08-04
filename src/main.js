import { app } from 'electron';

import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { performStartup } from './main/app';
import { createReduxStore } from './main/reduxStore';
import { setupI18n } from './main/i18n';
import { createElectronStore, mergePersistableValues } from './main/electronStore';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	performStartup();
	const reduxStore = createReduxStore();
	const electronStore = createElectronStore();

	mergePersistableValues(reduxStore, electronStore);

	app.whenReady().then(async () => {
		await setupI18n();
	});
}
