import createSagaMiddleware from 'redux-saga';

import { createElectronStore } from './main/electronStore';
import { createReduxStore } from './main/reduxStore';
import { createRootWindow } from './main/rootWindow';
import { handleStartup } from './main/startup';
import { rootSaga } from './main/sagas';
import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { setupI18next } from './main/i18n';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	handleStartup(async () => {
		const sagaMiddleware = createSagaMiddleware();
		const electronStore = createElectronStore();
		const reduxStore = createReduxStore(sagaMiddleware);

		await setupI18next();

		const rootWindow = await createRootWindow();

		sagaMiddleware.setContext({
			electronStore,
			store: reduxStore,
			reduxStore,
			rootWindow,
		});

		sagaMiddleware.run(rootSaga);
	});
}
