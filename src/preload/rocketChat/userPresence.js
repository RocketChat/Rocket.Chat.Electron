import { ipcRenderer } from 'electron';

import { SEND_SUSPEND, SEND_LOCK_SCREEN, INVOKE_SYSTEM_IDLE_STATE } from '../../ipc';

export const setupUserPresenceChanges = () => {
	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { UserPresence } = window.require('meteor/konecty:user-presence');
	const { getUserPreference } = window.require('/app/utils');

	ipcRenderer.addListener(SEND_SUSPEND, () => {
		Meteor.call('UserPresence:setDefaultStatus', 'away');
	});

	ipcRenderer.addListener(SEND_LOCK_SCREEN, () => {
		Meteor.call('UserPresence:setDefaultStatus', 'away');
	});

	let isAutoAwayEnabled;
	let idleThreshold;
	Tracker.autorun(() => {
		const uid = Meteor.userId();
		isAutoAwayEnabled = getUserPreference(uid, 'enableAutoAway');
		idleThreshold = getUserPreference(uid, 'idleTimeLimit');

		if (isAutoAwayEnabled) {
			delete UserPresence.awayTime;
			UserPresence.start();
		}
	});

	let prevState;
	setInterval(async () => {
		if (!idleThreshold) {
			return;
		}

		const state = await ipcRenderer.invoke(INVOKE_SYSTEM_IDLE_STATE, idleThreshold);

		if (prevState === state) {
			return;
		}

		const isOnline = !isAutoAwayEnabled || state === 'active' || state === 'unknown';

		if (isOnline) {
			Meteor.call('UserPresence:setDefaultStatus', 'online');
		} else {
			Meteor.call('UserPresence:setDefaultStatus', 'away');
		}

		prevState = state;
	}, 1000);
};
