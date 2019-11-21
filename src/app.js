import { setupErrorHandling } from './errorHandling';
import { start } from './scripts/start';
import setupAboutDialog from './scripts/aboutDialog';
import setupScreenSharingDialog from './scripts/screenSharingDialog';
import setupUpdateDialog from './scripts/updateDialog';

setupErrorHandling('renderer');
switch (document.currentScript.dataset.context) {
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
