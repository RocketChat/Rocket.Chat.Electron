import { Effect } from 'redux-saga/effects';
import semver from 'semver';

import { listenToBadgeChanges } from './badge';
import { listenToFaviconChanges } from './favicon';
import { listenToMessageBoxEvents } from './messageBox';
import { listenToNotificationsRequests } from './notifications';
import { listenToScreenSharingRequests } from './screenSharing';
import { listenToSideBarChanges } from './sidebar';
import { listenToTitleChanges } from './title';
import { listenToUserPresenceChanges } from './userPresence';

export const isRocketChat = (): boolean => {
	if (typeof window.require !== 'function') {
		return false;
	}

	try {
		const { Info } = window.require('/app/utils/rocketchat.info');
		return semver.satisfies(semver.coerce(Info.version), '>=3.0.x');
	} catch (error) {
		console.error(error);
		return false;
	}
};

export function *setupRocketChatPage(): Generator<Effect, void> {
	yield *listenToBadgeChanges();
	yield *listenToFaviconChanges();
	yield *listenToSideBarChanges();
	yield *listenToTitleChanges();
	yield *listenToUserPresenceChanges();
	yield *listenToMessageBoxEvents();
	yield *listenToNotificationsRequests();
	yield *listenToScreenSharingRequests();
}
