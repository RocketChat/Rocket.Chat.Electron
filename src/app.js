import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { remote } from 'electron';

import { setupErrorHandling } from './errorHandling';
import { setupI18next } from './i18n';
import { App } from './components/App';

const initialize = async () => {
	try {
		setupErrorHandling('renderer');
		await setupI18next();

		render(<App />, document.getElementById('root'));

		window.addEventListener('beforeunload', () => {
			unmountComponentAtNode(document.getElementById('root'));
		});
	} catch (error) {
		remote.dialog.showErrorBox(error.message, error.stack);
	}
};

initialize();
