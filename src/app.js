import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './components/App';
import { setupErrorHandling } from './rootWindow/errors';
import { setupI18next } from './rootWindow/i18n';
import { whenReady } from './whenReady';

whenReady().then(async () => {
	setupErrorHandling();

	await setupI18next();

	render(<App />, document.getElementById('root'));

	window.addEventListener('beforeunload', () => {
		unmountComponentAtNode(document.getElementById('root'));
	});
});
