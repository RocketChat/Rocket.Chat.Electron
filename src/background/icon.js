import { nativeImage, systemPreferences } from 'electron';


function getTrayIconSet({ platform, dark }) {
	if (platform === 'darwin') {
		return `darwin${ dark ? '-dark' : '' }`;
	}

	return platform;
}

function getTrayIconName({ title, count, platform }) {
	if (platform === 'darwin') {
		return (title || count) ? 'notification' : 'default';
	}

	if (title === '•') {
		return 'notification-dot';
	} else if (count > 0) {
		return count > 9 ? 'notification-plus-9' : `notification-${ String(count) }`;
	}

	return 'default';
}

function getTrayIconExtension({ platform }) {
	if (platform === 'win32') {
		return 'ico';
	}

	return 'png';
}

export function getAppIconPath() {
	return 'public/images/icon.png';
}

export function getTrayIconPath({ title, count, platform, dark } = {}) {
	if (typeof platform === 'undefined') {
		platform = process.platform;
	}

	if (platform === 'darwin' && typeof dark === 'undefined') {
		dark = systemPreferences.isDarkMode();
	}

	const params = { title, count, platform, dark };
	const iconset = getTrayIconSet(params);
	const name = getTrayIconName(params);
	const extension = getTrayIconExtension(params);
	return `public/images/tray/${ iconset }/${ name }.${ extension }`;
}

export function getAppIconImage() {
	return nativeImage.createFromPath(`${ __dirname }/${ getAppIconPath() }`);
}

export function getTrayIconImage({ title, count, platform, dark } = {}) {
	return nativeImage.createFromPath(`${ __dirname }/${ getTrayIconPath({ title, count, platform, dark }) }`);
}

export function getIconImage({ badge: { title, count } }) {
	const iconsetsPath = `${ __dirname }/public/images/tray`;
	const { platform } = process;
	const dark = systemPreferences.isDarkMode();
	const params = { title, count, platform, dark };
	const iconset = getTrayIconSet(params);
	const name = getTrayIconName(params);
	const extension = getTrayIconExtension(params);
	return nativeImage.createFromPath(`${ iconsetsPath }/${ iconset }/${ name }.${ extension }`);
}
