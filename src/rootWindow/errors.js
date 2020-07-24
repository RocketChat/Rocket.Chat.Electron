import Bugsnag from '@bugsnag/js';
import { remote } from 'electron';

export const setupErrorHandling = () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: remote.app.getVersion(),
			appType: 'rootWindow',
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
