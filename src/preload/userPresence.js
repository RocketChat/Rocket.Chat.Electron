import { ipcRenderer } from 'electron';


let maximumIdleTime = 10 * 1000;
const idleDetectionInterval = 1 * 1000;

const getMeteor = () => window.Meteor || (window.require && window.require('meteor/meteor').Meteor);
const getTracker = () => window.Tracker || (window.require && window.require('meteor/tracker').Tracker);
const getGetUserPreference = () => (
	(window.RocketChat && window.RocketChat.getUserPreference) ||
	(window.require && window.require('meteor/rocketchat:utils').getUserPreference)
);
const getUserPresence = () => (
	window.UserPresence ||
	(window.require && window.require('meteor/konecty:user-presence').UserPresence)
);

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
