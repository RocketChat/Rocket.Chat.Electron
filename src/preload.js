import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import { setupNotifications } from './preload/rocketChat/notifications';
import { setupSpellChecking } from './preload/spellChecking';
import { setupEditFlagsChanges } from './preload/editFlags';
import { setupUserPresenceChanges } from './preload/rocketChat/userPresence';
import { setupI18next } from './i18n';
import { setupErrorHandling } from './preload/errors';
import { isRocketChat } from './preload/rocketChat';
import { setupTitleChanges } from './preload/rocketChat/title';
import { whenReady } from './preload/utils';
import { setupFaviconChanges } from './preload/rocketChat/favicon';
import { setupSidebarChanges } from './preload/rocketChat/sidebar';
import { setupBadgeChanges } from './preload/rocketChat/badge';
import { setupMessageBoxEvents } from './preload/rocketChat/messageBox';
import { setupScreenSharingEvents } from './preload/screenSharing';

const initialize = () => {
	setupJitsiPreload();
	setupLinksPreload();
};

initialize();
whenReady().then(() => {
	setupErrorHandling();
	setupScreenSharingEvents();
	setupEditFlagsChanges();
	setupSpellChecking();

	if (isRocketChat()) {
		setupNotifications();
		setupTitleChanges();
		setupFaviconChanges();
		setupSidebarChanges();
		setupBadgeChanges();
		setupMessageBoxEvents();
		setupUserPresenceChanges();

		setupI18next().then((t) => {
			console.warn('%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
			console.warn('%c%s', 'font-size: 20px;', t('selfxss.description'));
			console.warn('%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));
		});
	}
});
