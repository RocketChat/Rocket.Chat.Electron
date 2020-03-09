import { remote, app } from 'electron';

import { getMeteor, getTracker, getGetUserPreference, getUserPresence } from './rocketChat';

const handleUserPresence = () => {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const getUserPreference = getGetUserPreference();
	const UserPresence = getUserPresence();

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
	setInterval(() => {
		const state = remote.powerMonitor.getSystemIdleState(idleThreshold);

		if (prevState === state) {
			return;
		}

		const isOnline = !isAutoAwayEnabled || state === 'active' || state === 'unknown';

		if (isOnline) {
			Meteor.call('UserPresence:online');
		} else {
			Meteor.call('UserPresence:away');
		}

		prevState = state;
	}, 1000);
};

// if the system is put to sleep or screen is locked(windows OS), set userPresence to away
const handleSystemActions = () => {
	const Meteor = getMeteor();
	remote.powerMonitor.on('suspend', () => {
		Meteor.call('UserPresence:away');
	});
	// windows OS only
	remote.powerMonitor.on('lock-screen', () => {
		Meteor.call('UserPresence:away');
	});
};
export default () => {
	window.addEventListener('load', handleUserPresence);
	window.addEventListener('load', handleSystemActions);
};
