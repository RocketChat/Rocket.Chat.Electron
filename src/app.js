import { setupErrorHandling } from './errorHandling';
import i18n from './i18n';
import attachEvents from './scripts/events';

const initialize = async () => {
	setupErrorHandling('renderer');
	await i18n.initialize();
	await attachEvents();
};

initialize();
