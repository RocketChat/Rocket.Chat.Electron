import { app } from 'electron';

import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../../selectors';

const setBadge = (globalBadgeText) => {
	app.dock.setBadge(globalBadgeText);
};

const bounce = () => {
	app.dock.bounce();
};

export const setupDock = (reduxStore) => {
	if (process.platform !== 'darwin') {
		return;
	}

	let prevGlobalBadgeText;
	reduxStore.subscribe(() => {
		const globalBadgeText = selectGlobalBadgeText(reduxStore.getState());
		if (prevGlobalBadgeText !== globalBadgeText) {
			setBadge(globalBadgeText);
			prevGlobalBadgeText = globalBadgeText;
		}
	});

	let prevGlobalBadgeCount;
	reduxStore.subscribe(() => {
		const globalBadgeCount = selectGlobalBadgeCount(reduxStore.getState());
		if (prevGlobalBadgeCount !== globalBadgeCount) {
			if (globalBadgeCount <= 0 || prevGlobalBadgeCount > 0) {
				return;
			}

			bounce();

			prevGlobalBadgeCount = globalBadgeCount;
		}
	});
};
