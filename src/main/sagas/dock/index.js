import { app } from 'electron';
import { takeEvery, fork, getContext } from 'redux-saga/effects';

import { storeChangeChannel } from '../../channels';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../../selectors';

function *watchBadgeText(store) {
	yield takeEvery(storeChangeChannel(store, selectGlobalBadgeText), function *([badgeText]) {
		app.dock.setBadge(badgeText);
	});
}

function *watchBadgeCount(store) {
	yield takeEvery(storeChangeChannel(store, selectGlobalBadgeCount), function *([count, prevCount]) {
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
