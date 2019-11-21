import { setupErrorHandling } from './errorHandling';
import { start } from './scripts/start';
import setupAboutDialog from './scripts/aboutDialog';

setupErrorHandling('renderer');
switch (document.currentScript.dataset.context) {
	case 'main':
		start();
		break;

	case 'about-dialog':
		setupAboutDialog();
		break;
}
