import { app } from 'electron';
import { Store } from 'redux';

import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../../selectors';

const setBadge = (globalBadgeText: string): void => {
	app.dock.setBadge(globalBadgeText);
};

const bounce = (): void => {
	app.dock.bounce();
};

export const setupDock = (reduxStore: Store): void => {
	if (process.platform !== 'darwin') {
		return;
	}

	let prevGlobalBadgeText: string;
	reduxStore.subscribe(() => {
		const globalBadgeText = selectGlobalBadgeText(reduxStore.getState());
		if (prevGlobalBadgeText !== globalBadgeText) {
			setBadge(globalBadgeText);
			prevGlobalBadgeText = globalBadgeText;
		}
	});

	let prevGlobalBadgeCount: number;
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
