import { remote } from 'electron';

import { getMeteor, getTracker, getGetUserPreference, getUserPresence } from './rocketChat';

const { powerMonitor } = remote;

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
		const state = powerMonitor.getSystemIdleState(idleThreshold);

		if (prevState !== state) {
			const isOnline = !isAutoAwayEnabled || state === 'active' || state === 'unknown';

			if (isOnline) {
				Meteor.call('UserPresence:online');
			} else {
				Meteor.call('UserPresence:away');
			}

			prevState = state;
		}
	}, 1000);
};

export default () => {
	window.addEventListener('load', handleUserPresence);
};
