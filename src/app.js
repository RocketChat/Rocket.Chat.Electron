import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setupI18next } from './rootWindow/i18n';
import { App } from './components/App';
import { setupErrorHandling } from './rootWindow/errors';

const initialize = async () => {
	await setupI18next();

	render(<App />, document.getElementById('root'));

	window.addEventListener('beforeunload', () => {
		unmountComponentAtNode(document.getElementById('root'));
	});
};

setupErrorHandling();
initialize();
