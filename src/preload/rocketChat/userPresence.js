import { ipcRenderer } from 'electron';

import {
	EVENT_SYSTEM_LOCKING_SCREEN,
	EVENT_SYSTEM_SUSPENDING,
	QUERY_SYSTEM_IDLE_STATE,
} from '../../ipc';

let isAutoAwayEnabled;
let idleThreshold;

export const setupUserPresenceChanges = () => {
	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { UserPresence } = window.require('meteor/konecty:user-presence');
	const { getUserPreference } = window.require('/app/utils');

	const goOnline = () => Meteor.call('UserPresence:setDefaultStatus', 'online');
	const goAway = () => Meteor.call('UserPresence:setDefaultStatus', 'away');

	Tracker.autorun(() => {
		const uid = Meteor.userId();
		isAutoAwayEnabled = getUserPreference(uid, 'enableAutoAway');
		idleThreshold = getUserPreference(uid, 'idleTimeLimit');

		if (isAutoAwayEnabled) {
			delete UserPresence.awayTime;
			UserPresence.start();
		}
	});

	ipcRenderer.addListener(EVENT_SYSTEM_SUSPENDING, () => {
		if (!isAutoAwayEnabled) {
			return;
		}

		goAway();
	});

	ipcRenderer.addListener(EVENT_SYSTEM_LOCKING_SCREEN, () => {
		if (!isAutoAwayEnabled) {
			return;
		}

		goAway();
	});

	let prevState;

	const pollSystemIdleState = async () => {
		if (!isAutoAwayEnabled || !idleThreshold) {
			return;
		}

		const state = await ipcRenderer.invoke(QUERY_SYSTEM_IDLE_STATE, idleThreshold);

		if (prevState === state) {
			setTimeout(pollSystemIdleState, 1000);
			return;
		}

		const isOnline = !isAutoAwayEnabled || state === 'active' || state === 'unknown';

		if (isOnline) {
			goOnline();
		} else {
			goAway();
		}

		prevState = state;
		setTimeout(pollSystemIdleState, 1000);
	};

	pollSystemIdleState();
};
