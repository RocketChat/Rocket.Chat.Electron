export function getMeteor() {
	if (!window.require) {
		return window.Meteor;
	}

	try {
		return window.require('meteor/meteor').Meteor;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export function getTracker() {
	if (!window.require) {
		return window.Tracker;
	}

	try {
		return window.require('meteor/tracker').Tracker;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export function getUserPresence() {
	if (!window.require) {
		return window.UserPresence;
	}

	try {
		return window.require('meteor/konecty:user-presence').UserPresence;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export function getSettings() {
	if (!window.require) {
		return window.RocketChat && window.RocketChat.settings;
	}

	try {
		return window.require('/app/settings').settings;
	} catch (_) {
		try {
			return window.require('meteor/rocketchat:settings').settings;
		} catch (error) {
			console.error(error);
			return null;
		}
	}
}

export function getGetUserPreference() {
	if (!window.require) {
		return window.RocketChat && window.RocketChat.getUserPreference;
	}

	try {
		return window.require('/app/utils').getUserPreference;
	} catch (_) {
		try {
			return window.require('meteor/rocketchat:utils').getUserPreference;
		} catch (error) {
			console.error(error);
			return null;
		}
	}
}
