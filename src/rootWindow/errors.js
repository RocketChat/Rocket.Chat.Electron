import Bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';

import {
	QUERY_APP_VERSION,
	EVENT_ERROR_THROWN,
} from '../ipc';

const setupBugsnag = async (apiKey) => {
	const appVersion = await ipcRenderer.invoke(QUERY_APP_VERSION);

	Bugsnag.start({
		apiKey,
		appVersion,
		appType: 'rootWindow',
		collectUserIp: false,
		releaseStage: process.env.NODE_ENV,
	});
};

const handleErrorEvent = (event) => {
	const { error } = event;
	ipcRenderer.send(EVENT_ERROR_THROWN, error && (error.stack || error));
};

const handleUnhandledRejectionEvent = (event) => {
	const { reason } = event;
	ipcRenderer.send(EVENT_ERROR_THROWN, reason && (reason.stack || reason));
};

export const setupErrorHandling = () => {
	if (process.env.BUGSNAG_API_KEY) {
		setupBugsnag(process.env.BUGSNAG_API_KEY);
		return;
	}

	window.addEventListener('error', handleErrorEvent);
	window.addEventListener('unhandledrejection', handleUnhandledRejectionEvent);
};
