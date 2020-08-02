import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import { setupNotifications } from './preload/notifications';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupChangesPreload from './preload/changes';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';
import { setupErrorHandling } from './preload/errors';
import { isRocketChat } from './preload/rocketChat';

const initialize = async () => {
	await setupI18next();

	setupJitsiPreload();
	setupLinksPreload();
	setupSpellcheckingPreload();
	setupChangesPreload();
	setupUserPresencePreload();
};

const whenReady = () => new Promise((resolve) => {
	if (document.readyState !== 'loading') {
		resolve();
		return;
	}

	const handleReadyStateChange = () => {
		if (document.readyState === 'loading') {
			return;
		}

		document.removeEventListener('readystatechange', handleReadyStateChange);
		resolve();
	};

	document.addEventListener('readystatechange', handleReadyStateChange);
});

initialize();
whenReady().then(() => {
	setupErrorHandling();

	if (isRocketChat()) {
		setupNotifications();
	}
});
