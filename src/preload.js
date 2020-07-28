import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import { setupNotifications } from './preload/notifications';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupChangesPreload from './preload/changes';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';
import { setupErrorHandling } from './preload/errors';

const initialize = async () => {
	await setupI18next();

	setupJitsiPreload();
	setupLinksPreload();
	setupSpellcheckingPreload();
	setupChangesPreload();
	setupUserPresencePreload();
};

initialize();

setupErrorHandling();
setupNotifications();
