import { nativeImage, systemPreferences } from 'electron';


function getIconSet({ platform }) {
	if (platform === 'darwin') {
		return `darwin${ systemPreferences.isDarkMode() ? '-dark' : '' }`;
	}

	return platform;
}

function getIconName({ title, count, platform }) {
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

function getIconExtension({ platform }) {
	if (platform === 'win32') {
		return 'ico';
	}

	return 'png';
}

export function getIconImage({ badge: { title, count } }) {
	const iconsetsPath = `${ __dirname }/public/images/tray`;
	const { platform } = process;
	const params = { title, count, platform };
	const iconset = getIconSet(params);
	const name = getIconName(params);
	const extension = getIconExtension(params);
	return nativeImage.createFromPath(`${ iconsetsPath }/${ iconset }/${ name }.${ extension }`);
}
