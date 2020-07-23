import { app } from 'electron';
import { call } from 'redux-saga/effects';

import { getPlatform } from '../app';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../selectors';
import { watchValue } from '../sagas/utils';

const setBadge = (globalBadgeText) => {
	app.dock.setBadge(globalBadgeText);
};

const bounce = () => {
	app.dock.bounce();
};

function *watchUpdates() {
	yield watchValue(selectGlobalBadgeText, function *([text]) {
		yield call(setBadge, text);
	});

	yield watchValue(selectGlobalBadgeCount, function *([count, prevCount]) {
		if (count <= 0 || prevCount > 0) {
			return;
		}

		yield call(bounce);
	});
}

export function *setupDock() {
	const platform = yield call(getPlatform);

	if (platform !== 'darwin') {
		return;
	}

	yield *watchUpdates();
}
