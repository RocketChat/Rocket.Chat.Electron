import Bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';

import { INVOKE_APP_VERSION, SEND_LOG_ERROR } from '../ipc';

export const setupErrorHandling = async () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: await ipcRenderer.invoke(INVOKE_APP_VERSION),
			appType: 'webviewPreload',
			collectUserIp: false,
			releaseStage: process.env.NODE_ENV,
			onError: (event) => {
				event.context = window.location.href;
			},
		});

		return;
	}

	window.addEventListener('error', (event) => {
		const { error } = event;
		ipcRenderer.send(SEND_LOG_ERROR, error && (error.stack || error));
	});

	window.addEventListener('unhandledrejection', (event) => {
		const { reason } = event;
		ipcRenderer.send(SEND_LOG_ERROR, reason && (reason.stack || reason));
	});
};
