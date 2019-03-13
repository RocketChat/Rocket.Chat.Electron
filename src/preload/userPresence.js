import { ipcRenderer } from 'electron';
import { getMeteor, getTracker, getGetUserPreference, getUserPresence } from './rocketChat';


let maximumIdleTime = 10 * 1000;
const idleDetectionInterval = 1 * 1000;

function onChangeUserPresence(isUserPresent) {
	const UserPresence = getUserPresence();

	if (!UserPresence) {
		return;
	}

	if (isUserPresent) {
		UserPresence.setOnline();
		return;
	}

	UserPresence.setAway();
}

let wasUserPresent = false;

function pollUserPresence() {
	let isUserPresent = false;

	try {
		const idleTime = ipcRenderer.sendSync('request-system-idle-time');
		isUserPresent = idleTime < maximumIdleTime;
	} catch (error) {
		console.error(error);
	}

	if (isUserPresent !== wasUserPresent) {
		onChangeUserPresence(isUserPresent);
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
		if (getUserPreference(userId, 'enableAutoAway')) {
			maximumIdleTime = (getUserPreference(userId, 'idleTimeLimit') || 300) * 1000;
		}
	});

	setInterval(pollUserPresence, idleDetectionInterval);
}


export default () => {
	window.addEventListener('load', handleUserPresence);
};
