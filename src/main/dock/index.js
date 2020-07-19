import { app } from 'electron';
import { createSelector } from 'reselect';

import { runSaga } from '../reduxStore';
import { watch } from '../../sagaUtils';

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

function *dockSaga() {
	if (process.platform !== 'darwin') {
		return;
	}

	yield watch(selectBadgeText, function *(badgeText) {
		app.dock.setBadge(badgeText);
	});

	let prevCount;
	yield watch(selectBadgeCount, function *(count) {
		if (count > 0 && prevCount === 0) {
			app.dock.bounce();
		}
		prevCount = count;
	});
}

export const setupDock = () => {
	runSaga(dockSaga);
};
