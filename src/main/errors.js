import Bugsnag from '@bugsnag/js';
import { app } from 'electron';

export const setupErrorHandling = () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: app.getVersion(),
			appType: 'main',
			collectUserIp: false,
			releaseStage: process.env.NODE_ENV,
		});

		return;
	}

	process.addListener('uncaughtException', (error) => {
		console.error(error);
		app.quit(1);
	});

	process.addListener('unhandledRejection', (reason) => {
		console.error(reason);
		app.quit(1);
	});
};
