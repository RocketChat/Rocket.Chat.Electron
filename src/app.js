import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './components/App';
import { setupErrorHandling } from './rootWindow/errors';
import { setupI18next } from './rootWindow/i18n';
import { createReduxStore } from './rootWindow/reduxStore';
import { whenReady } from './whenReady';

whenReady().then(async () => {
	const reduxStore = await createReduxStore();
	setupErrorHandling(reduxStore);

	await setupI18next();

	render(<App reduxStore={reduxStore} />, document.getElementById('root'));

	window.addEventListener('beforeunload', () => {
		unmountComponentAtNode(document.getElementById('root'));
	});
});
