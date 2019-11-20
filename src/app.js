import { start } from './scripts/start';
import { setupErrorHandling } from './errorHandling';

setupErrorHandling('renderer');
switch (document.currentScript.dataset.context) {
	case 'main':
		start();
		break;
}
