import { setupErrorHandling } from './errorHandling';
import i18n from './i18n';
import attachEvents from './scripts/events';

const initialize = async (context) => {
	setupErrorHandling('renderer');

	await i18n.initialize();

	switch (context) {
		case 'main':
			await attachEvents();
			break;
	}
};

initialize(document.currentScript.dataset.context);
