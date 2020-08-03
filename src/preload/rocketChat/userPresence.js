import { ipcRenderer } from 'electron';

export const setupUserPresenceChanges = () => {
	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { UserPresence } = window.require('meteor/konecty:user-presence');
	const { getUserPreference } = window.require('/app/utils');

	ipcRenderer.addListener('suspend', () => {
		Meteor.call('UserPresence:setDefaultStatus', 'away');
	});

	ipcRenderer.addListener('lock-screen', () => {
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
		const state = await ipcRenderer.invoke('get-system-idle-state', idleThreshold);

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
