import { app as mainApp, remote } from 'electron';

const app = mainApp || remote.app;
const Bugsnag = remote ? require('@bugsnag/browser') : require('@bugsnag/node');

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

export const setupErrorHandling = (appType) => {
	if (remote) {
		// eslint-disable-next-line no-proto
		setTimeout(() => {}).__proto__.unref = () => {};
	}

	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: app.getVersion(),
			appType,
			collectUserIp: false,
			releaseStage: process.env.NODE_ENV,
		});

		return;
	}

	const handleError = (error) => {
		logger.error(error && (error.stack || error));
		!remote && app.quit(1);
	};

	process.addListener('uncaughtException', handleError);
	process.addListener('unhandledRejection', handleError);
};

export const reportError = (error) => {
	logger.error(error && (error.stack || error));
	Bugsnag.notify(error, { severity: 'error' });
};

export const reportWarning = (error) => {
	logger.warn(error && (error.stack || error));
	Bugsnag.notify(error, { severity: 'warning' });
};

export const reportInfo = (error) => {
	logger.info(error && (error.stack || error));
	Bugsnag.notify(error, { severity: 'info' });
};
