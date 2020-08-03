import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import { setupNotifications } from './preload/rocketChat/notifications';
import setupSpellcheckingPreload from './preload/spellChecking';
import setupChangesPreload from './preload/changes';
import setupUserPresencePreload from './preload/userPresence';
import { setupI18next } from './i18n';
import { setupErrorHandling } from './preload/errors';
import { isRocketChat } from './preload/rocketChat';
import { setupTitleChanges } from './preload/rocketChat/title';
import { whenReady } from './preload/utils';
import { setupFaviconChanges } from './preload/rocketChat/favicon';
import { setupSidebarChanges } from './preload/rocketChat/sidebar';
import { setupBadgeChanges } from './preload/rocketChat/badge';
import { setupMessageBoxEvents } from './preload/rocketChat/messageBox';

const initialize = async () => {
	await setupI18next();

	setupJitsiPreload();
	setupLinksPreload();
	setupSpellcheckingPreload();
	setupChangesPreload();
	setupUserPresencePreload();
};

initialize();
whenReady().then(() => {
	setupErrorHandling();

	if (isRocketChat()) {
		setupNotifications();
		setupTitleChanges();
		setupFaviconChanges();
		setupSidebarChanges();
		setupBadgeChanges();
		setupMessageBoxEvents();
	}
});
