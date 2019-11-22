import { setupErrorHandling } from './errorHandling';
import { start } from './scripts/start';
import i18n from './i18n';

const initialize = async (context) => {
	setupErrorHandling('renderer');

	await i18n.initialize();

	switch (context) {
		case 'main':
			start();
			break;
	}
};

initialize(document.currentScript.dataset.context);
