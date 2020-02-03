import { setupErrorHandling } from './errorHandling';
import setupEventsPreload from './preload/events';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupChangesPreload from './preload/changes';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';

const initialize = async () => {
	setupErrorHandling('preload');

	await setupI18next();

	setupEventsPreload();
	setupJitsiPreload();
	setupLinksPreload();
	setupNotificationsPreload();
	setupSpellcheckingPreload();
	setupChangesPreload();
	setupUserPresencePreload();
};

initialize();
