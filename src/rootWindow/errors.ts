import Bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';

import {
	QUERY_APP_VERSION,
	EVENT_ERROR_THROWN,
} from '../ipc';

const setupBugsnag = async (apiKey: string): Promise<void> => {
	const appVersion = await ipcRenderer.invoke(QUERY_APP_VERSION);

	Bugsnag.start({
		apiKey,
		appVersion,
		appType: 'rootWindow',
		collectUserIp: false,
		releaseStage: process.env.NODE_ENV,
	});
};

const handleErrorEvent = (event: ErrorEvent): void => {
	const { error } = event;
	ipcRenderer.send(EVENT_ERROR_THROWN, error && (error.stack || error));
};

const handleUnhandledRejectionEvent = (event: PromiseRejectionEvent): void => {
	const { reason } = event;
	ipcRenderer.send(EVENT_ERROR_THROWN, reason && (reason.stack || reason));
};

export const setupErrorHandling = async (): Promise<void> => {
	if (process.env.BUGSNAG_API_KEY) {
		await setupBugsnag(process.env.BUGSNAG_API_KEY);
		return;
	}

	window.addEventListener('error', handleErrorEvent);
	window.addEventListener('unhandledrejection', handleUnhandledRejectionEvent);
};
