import semver from 'semver';

export const isRocketChat = (): boolean => {
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

export const getServerUrl = (): string => {
	const { Meteor } = window.require('meteor/meteor');
	return Meteor.absoluteUrl().replace(/\/$/, '');
};
