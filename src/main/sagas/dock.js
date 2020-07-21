import { app } from 'electron';
import { takeEvery, getContext } from 'redux-saga/effects';

import { storeChangeChannel } from '../channels';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../selectors';

export function *dockSaga() {
	if (process.platform !== 'darwin') {
		return;
	}

	const store = yield getContext('store');

	yield takeEvery(storeChangeChannel(store, selectGlobalBadgeText), function *([badgeText]) {
		app.dock.setBadge(badgeText);
	});

	yield takeEvery(storeChangeChannel(store, selectGlobalBadgeCount), function *([count, prevCount]) {
		if (count <= 0 || prevCount > 0) {
			return;
		}

		app.dock.bounce();
	});
}
