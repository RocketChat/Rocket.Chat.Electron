import { setupErrorHandling } from './errorHandling';
import { start } from './scripts/start';
import setupAboutDialog from './scripts/aboutDialog';
import setupScreenSharingDialog from './scripts/screenSharingDialog';
import setupUpdateDialog from './scripts/updateDialog';
import i18n from './i18n';

const initialize = async (context) => {
	setupErrorHandling('renderer');

	await i18n.initialize();

	switch (context) {
		case 'main':
			start();
			break;

		case 'about-dialog':
			setupAboutDialog();
			break;

		case 'screen-sharing-dialog':
			setupScreenSharingDialog();
			break;

		case 'update-dialog':
			setupUpdateDialog();
			break;
	}
};

initialize(document.currentScript.dataset.context);
