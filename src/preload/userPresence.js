import { ipcRenderer } from 'electron';
import { getMeteor, getTracker, getGetUserPreference, getUserPresence } from './rocketChat';

const pollUserPresence = (UserPresence, maximumIdleTime) => {
	
	return () => {
		let isUserPresent = true;

		try {
			const idleTime = ipcRenderer.sendSync('request-system-idle-time');
			isUserPresent = idleTime < maximumIdleTime;
		
			if (isUserPresent) {	
				UserPresence.setOnline();
				
			} else {
				UserPresence.setAway();
			}
		} catch (error) {
			console.error(error);
		} finally {
			wasUserPresent = isUserPresent;
		}
	};
};

const handleUserPresence = () => {
	const Meteor = getMeteor();
	const Tracker = getTracker();
	const getUserPreference = getGetUserPreference();
	const UserPresence = getUserPresence();

	if (!Meteor || !Tracker || !getUserPreference || !UserPresence) {
		return;
	}

	let intervalID;

	Tracker.autorun(() => {
		if (intervalID) {
			clearInterval(intervalID);
			intervalID = null;
		}

		const uid = Meteor.userId();

		if (!uid) {
			return;
		}

		delete UserPresence.awayTime;
		UserPresence.awayOnWindowBlur = false;
		UserPresence.start();

		const isAutoAwayEnabled = getUserPreference(uid, 'enableAutoAway');

		if (!isAutoAwayEnabled) {
			UserPresence.setOnline();
			return;
		}

		const maximumIdleTime = (getUserPreference(uid, 'idleTimeLimit') || 300) * 1000;
		const idleTimeDetectionInterval = 5000;
		const callback = pollUserPresence(UserPresence, maximumIdleTime);

		intervalID = setInterval(callback, idleTimeDetectionInterval);
	});
};


export default () => {
	window.addEventListener('load', handleUserPresence);
};
