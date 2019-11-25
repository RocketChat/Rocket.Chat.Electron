import { setupErrorHandling } from './errorHandling';
import { setupI18next } from './i18n';
import attachEvents from './scripts/events';

const initialize = async () => {
	setupErrorHandling('renderer');
	await setupI18next();
	await attachEvents();
};

initialize();
