import { setupEditFlagsChanges } from './preload/editFlags';
import { setupErrorHandling } from './preload/errors';
import { isJitsi } from './preload/jitsi';
import { setupJitsiMeetElectron } from './preload/jitsi/electron';
import { createReduxStore } from './preload/reduxStore';
import { isRocketChat } from './preload/rocketChat';
import { setupBadgeChanges } from './preload/rocketChat/badge';
import { setupFaviconChanges } from './preload/rocketChat/favicon';
import { setupMessageBoxEvents } from './preload/rocketChat/messageBox';
import { setupNotifications } from './preload/rocketChat/notifications';
import { setupSidebarChanges } from './preload/rocketChat/sidebar';
import { setupTitleChanges } from './preload/rocketChat/title';
import { setupUserPresenceChanges } from './preload/rocketChat/userPresence';
import { setupScreenSharing } from './preload/screenSharing';
import { setupSpellChecking } from './preload/spellChecking';
import { whenReady } from './whenReady';

Promise.all([
	createReduxStore(),
	whenReady(),
]).then(() => {
	setupErrorHandling();
	setupEditFlagsChanges();
	setupScreenSharing();
	setupSpellChecking();

	if (isRocketChat()) {
		setupBadgeChanges();
		setupFaviconChanges();
		setupSidebarChanges();
		setupTitleChanges();
		setupUserPresenceChanges();
		setupMessageBoxEvents();
		setupNotifications();
	}

	if (isJitsi()) {
		setupJitsiMeetElectron();
	}
});
