import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { handleStartup } from './main/startup';
import { setupReduxStore } from './main/reduxStore';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	handleStartup();
	setupReduxStore();
}
