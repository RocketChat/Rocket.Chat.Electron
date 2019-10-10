const { notarize } = require('electron-notarize');

exports.default = function notarizing(context) {
	const { electronPlatformName, appOutDir } = context;
	if (electronPlatformName !== 'darwin' || process.env.TRAVIS_PULL_REQUEST !== 'false') {
		return;
	}

	const appName = context.packager.appInfo.productFilename;

	console.log(`Notarizing ${ appOutDir }/${ appName }.app...`);
	return notarize({
		appBundleId: 'chat.rocket',
		appPath: `${ appOutDir }/${ appName }.app`,
		appleId: process.env.APPLEID,
		appleIdPassword: process.env.APPLEIDPASS,
		ascProvider: 'S6UPZG7ZR3',
	});
};
