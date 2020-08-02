import semver from 'semver';

export const isRocketChat = () => {
	if (typeof window.require !== 'function') {
		return false;
	}

	try {
		const { Info } = window.require('/app/utils/rocketchat.info');
		return semver.satisfies(semver.coerce(Info.version), '>=3.0.x');
	} catch (error) {
		console.error(error);
		return false;
	}
};

export const getMeteor = () => window.require('meteor/meteor').Meteor;

export const getTracker = () => window.require('meteor/tracker').Tracker;

export const getUserPresence = () => window.require('meteor/konecty:user-presence').UserPresence;

export const getSettings = () => window.require('/app/settings').settings;

export const getGetUserPreference = () => window.require('/app/utils').getUserPreference;
