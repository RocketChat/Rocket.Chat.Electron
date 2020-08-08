import { Store } from 'redux';
import { Effect, call } from 'redux-saga/effects';

import { takeRequests } from '../channels';
import { whenReady } from '../whenReady';
import { setupEditFlagsChanges } from './editFlags';
import { setupErrorHandling } from './errors';
import { isJitsi } from './jitsi';
import { setupJitsiMeetElectron } from './jitsi/electron';
import { isRocketChat } from './rocketChat';
import { setupBadgeChanges } from './rocketChat/badge';
import { setupFaviconChanges } from './rocketChat/favicon';
import { setupMessageBoxEvents } from './rocketChat/messageBox';
import { setupNotifications } from './rocketChat/notifications';
import { setupSidebarChanges } from './rocketChat/sidebar';
import { setupTitleChanges } from './rocketChat/title';
import { setupUserPresenceChanges } from './rocketChat/userPresence';
import { setupScreenSharing } from './screenSharing';
import { setupSpellChecking } from './spellChecking';

export function *rootSaga(reduxStore: Store): Generator<Effect> {
	yield *takeRequests();

	yield call(async () => {
		await whenReady();

		setupErrorHandling(reduxStore);
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
}
