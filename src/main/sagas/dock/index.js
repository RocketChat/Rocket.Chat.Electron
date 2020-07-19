import { app } from 'electron';
import { takeEvery, fork, getContext } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import { storeChangeChannel, storeValueChannel } from '../../channels';

const selectBadges = ({ servers }) => servers.map(({ badge }) => badge);

const selectBadge = createSelector(selectBadges, (badges) => {
	const mentionCount = badges
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
	return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
});

const selectBadgeText = createSelector(selectBadge, (badge) => {
	if (badge === '•') {
		return '•';
	}

	if (Number.isInteger(badge)) {
		return String(badge);
	}

	return '';
});

const selectBadgeCount = createSelector(selectBadge, (badge) => (Number.isInteger(badge) ? badge : 0));

function *watchBadgeText() {
	const store = yield getContext('store');
	const badgeTextChannel = storeValueChannel(store, selectBadgeText);

	yield takeEvery(badgeTextChannel, function *(badgeText) {
		app.dock.setBadge(badgeText);
	});
}

function *watchBadgeCount() {
	const store = yield getContext('store');
	const badgeCountChannel = storeChangeChannel(store, selectBadgeCount);

	yield takeEvery(badgeCountChannel, function *([count, prevCount]) {
		if (count > 0 && prevCount === 0) {
			app.dock.bounce();
		}
	});
}

export function *dockSaga() {
	if (process.platform !== 'darwin') {
		return;
	}

	yield fork(watchBadgeText);
	yield fork(watchBadgeCount);
}
