import bugsnag from '@bugsnag/js';
import { app as mainApp, remote } from 'electron';

const app = mainApp || remote.app;

const logger = !remote ? console : new Proxy(console, {
	get(target, propKey) {
		if (typeof target[propKey] !== 'function') {
			return target[propKey];
		}

		const origMethod = target[propKey];
		const remoteMethod = remote.getGlobal('console')[propKey];

		return function(...args) {
			const result = origMethod.apply(this, args);
			remoteMethod.apply(this, args);
			return result;
		};
	},
});

let bugsnagClient;

export const setupErrorHandling = (appType) => {
	if (remote) {
		// eslint-disable-next-line no-proto
		setTimeout(() => {}).__proto__.unref = () => {};
	}

	const handleError = (error) => {
		logger.error(error && (error.stack || error));
		!remote && app.quit(1);
	};

	if (process.env.BUGSNAG_API_KEY) {
		bugsnagClient = bugsnag({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: app.getVersion(),
			appType,
			collectUserIp: false,
			onUncaughtException: handleError,
			onUnhandledRejection: handleError,
			releaseStage: process.env.NODE_ENV,
		});

		return;
	}

	process.on('uncaughtException', handleError);
	process.on('unhandledRejection', handleError);
};

export const reportError = (error) => {
	logger.error(error && (error.stack || error));
	bugsnagClient && bugsnagClient.notify(error, { severity: 'error' });
};

export const reportWarning = (error) => {
	logger.warn(error && (error.stack || error));
	bugsnagClient && bugsnagClient.notify(error, { severity: 'warning' });
};

export const reportInfo = (error) => {
	logger.info(error && (error.stack || error));
	bugsnagClient && bugsnagClient.notify(error, { severity: 'info' });
};
