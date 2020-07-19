import { app } from 'electron';
import { takeEvery, fork, getContext } from 'redux-saga/effects';

import { storeChangeChannel, storeValueChannel } from '../../channels';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../../selectors';

function *watchBadgeText(store) {
	const badgeTextChannel = storeValueChannel(store, selectGlobalBadgeText);

	yield takeEvery(badgeTextChannel, function *(badgeText) {
		app.dock.setBadge(badgeText);
	});
}

function *watchBadgeCount(store) {
	const badgeCountChannel = storeChangeChannel(store, selectGlobalBadgeCount);

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

	const store = yield getContext('store');

	yield fork(watchBadgeText, store);
	yield fork(watchBadgeCount, store);
}
