import Bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';
import { Store } from 'redux';

import { EVENT_ERROR_THROWN } from '../ipc';

const setupBugsnag = (apiKey: string, appVersion: string): void => {
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

export const setupErrorHandling = (reduxStore: Store): void => {
	if (process.env.BUGSNAG_API_KEY) {
		const apiKey = process.env.BUGSNAG_API_KEY;
		const appVersion = (({ appVersion }) => appVersion)(reduxStore.getState());
		setupBugsnag(apiKey, appVersion);
		return;
	}

	window.addEventListener('error', handleErrorEvent);
	window.addEventListener('unhandledrejection', handleUnhandledRejectionEvent);
};
