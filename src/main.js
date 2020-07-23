import { setupReduxStore } from './main/reduxStore';
import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	setupReduxStore();
}
