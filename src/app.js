import Bugsnag from '@bugsnag/js';
import { remote } from 'electron';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { setupI18next } from './i18n';
import { App } from './components/App';

const setupErrorHandling = () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: remote.app.getVersion(),
			appType: 'renderer',
			collectUserIp: false,
			releaseStage: process.env.NODE_ENV,
		});

		return;
	}

	const log = (error) => {
		remote.getGlobal('console').error(error && (error.stack || error));
	};

	window.addEventListener('error', (event) => {
		log(event.error);
	});

	window.addEventListener('unhandledrejection', (event) => {
		log(event.reason);
	});
};

const initialize = async () => {
	setupErrorHandling();

	try {
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
