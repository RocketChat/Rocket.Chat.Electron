import Bugsnag from '@bugsnag/js';
import { Store } from 'redux';

import {
	APP_ERROR_THROWN,
} from '../actions';
import { dispatch } from '../channels';

const setupBugsnag = (apiKey: string, appVersion: string): void => {
	Bugsnag.start({
		apiKey,
		appVersion,
		appType: 'webviewPreload',
		collectUserIp: false,
		releaseStage: process.env.NODE_ENV,
		onError: (event) => {
			event.context = window.location.href;
		},
	});
};

const handleErrorEvent = (event: ErrorEvent): void => {
	const { error } = event;
	dispatch({
		type: APP_ERROR_THROWN,
		payload: {
			message: error.message,
			stack: error.stack,
			name: error.name,
		},
	});
};

const handleUnhandledRejectionEvent = (event: PromiseRejectionEvent): void => {
	const { reason } = event;
	dispatch({
		type: APP_ERROR_THROWN,
		payload: {
			message: reason.message,
			stack: reason.stack,
			name: reason.name,
		},
	});
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
