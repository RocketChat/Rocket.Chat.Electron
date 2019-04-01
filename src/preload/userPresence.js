import { ipcRenderer } from 'electron';
import { getMeteor, getTracker, getGetUserPreference, getUserPresence } from './rocketChat';


let idleDetectionInterval;
let maximumIdleTime;
let wasUserPresent = false;
let autoAwayEnabled = false;
let intervalHandler;

function setUserPresence(isUserPresent) {
	const UserPresence = getUserPresence();

	if (!UserPresence) {
		return;
	}

	if (isUserPresent) {
		UserPresence.setOnline();
	} else {
		UserPresence.setAway();
	}
}

function pollUserPresence() {
	let isUserPresent = true;

	try {
		const idleTime = ipcRenderer.sendSync('request-system-idle-time');
		isUserPresent = idleTime < maximumIdleTime;
		const changed = isUserPresent !== wasUserPresent;

		if (autoAwayEnabled && changed) {
			setUserPresence(isUserPresent);
			return;
		}

		if (!autoAwayEnabled && isUserPresent) {
			setUserPresence(isUserPresent);
			return;
		}
	} catch (error) {
		console.error(error);
	} finally {
		wasUserPresent = isUserPresent;
	}
}

function handleUserPresence() {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const getUserPreference = getGetUserPreference();

	if (!Meteor || !Tracker || !getUserPreference) {
		return;
	}

	Tracker.autorun(() => {
		if (!Meteor.userId()) {
			return;
		}

		const userId = Meteor.userId();
		autoAwayEnabled = getUserPreference(userId, 'enableAutoAway');

		if (autoAwayEnabled) {
			idleDetectionInterval = 1 * 1000;
			maximumIdleTime = (getUserPreference(userId, 'idleTimeLimit') || 300) * 1000;
		} else {
			idleDetectionInterval = 10 * 1000;
			maximumIdleTime = 10 * 1000;
		}

		if (intervalHandler) {
			clearInterval(intervalHandler);
		}

		intervalHandler = setInterval(pollUserPresence, idleDetectionInterval);
	});
}


export default () => {
	window.addEventListener('load', handleUserPresence);
};
