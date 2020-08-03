import Bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';

export const setupErrorHandling = async () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: await ipcRenderer.invoke('app-version'),
			appType: 'webviewPreload',
			collectUserIp: false,
			releaseStage: process.env.NODE_ENV,
			onError: (event) => {
				event.context = window.location.href;
			},
		});

		return;
	}

	const log = (error) => {
		ipcRenderer.send('log-error', error && (error.stack || error));
	};

	window.addEventListener('error', (event) => {
		log(event.error);
	});

	window.addEventListener('unhandledrejection', (event) => {
		log(event.reason);
	});
};
