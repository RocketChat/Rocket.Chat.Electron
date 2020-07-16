import Bugsnag from '@bugsnag/js';
import { remote } from 'electron';

import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupChangesPreload from './preload/changes';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';

const setupErrorHandling = () => {
	if (process.env.BUGSNAG_API_KEY) {
		Bugsnag.start({
			apiKey: process.env.BUGSNAG_API_KEY,
			appVersion: remote.app.getVersion(),
			appType: 'preload',
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

const initialize = async () => {
	setupErrorHandling();

	await setupI18next();

	setupJitsiPreload();
	setupLinksPreload();
	setupNotificationsPreload();
	setupSpellcheckingPreload();
	setupChangesPreload();
	setupUserPresencePreload();
};

initialize();
