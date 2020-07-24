import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { performStartup } from './main/app';
import { setupReduxStore } from './main/reduxStore';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	performStartup();
	setupReduxStore();
}
