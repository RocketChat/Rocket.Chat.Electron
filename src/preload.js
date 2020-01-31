import { setupErrorHandling } from './errorHandling';
import setupEventsPreload from './preload/events';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSidebarPreload from './preload/sidebar';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupTitleChangePreload from './preload/titleChange';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';

const initialize = async () => {
	setupErrorHandling('preload');

	await setupI18next();

	setupEventsPreload();
	setupJitsiPreload();
	setupLinksPreload();
	setupNotificationsPreload();
	setupSidebarPreload();
	setupSpellcheckingPreload();
	setupTitleChangePreload();
	setupUserPresencePreload();
};

initialize();
