import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { handleStartup } from './main/startup';
import { setupAppEvents } from './main/events';
import { setupWindow } from './main/window';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	handleStartup();
	setupAppEvents();
	setupWindow();
}
