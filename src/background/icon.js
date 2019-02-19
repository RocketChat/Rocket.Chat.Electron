import { nativeImage, systemPreferences } from 'electron';


function getIconImageDarwin({ iconsetsPath, title, count }) {
	const iconset = `darwin${ systemPreferences.isDarkMode() ? '-dark' : '' }`;
	const name = (title || count) ? 'notification' : 'default';
	return nativeImage.createFromPath(`${ iconsetsPath }/${ iconset }/${ name }.png`);
}

function getIconImageLinux({ iconsetsPath, title, count }) {
	const iconset = 'linux';
	let name = 'default';

	if (title === '•') {
		name = 'notification-dot';
	} else if (count > 0) {
		name = count > 9 ? 'notification-plus-9' : `notification-${ String(count) }`;
	}

	return nativeImage.createFromPath(`${ iconsetsPath }/${ iconset }/${ name }.png`);
}

function getIconImageWin32({ iconsetsPath, title, count }) {
	const iconset = 'linux';
	let name = 'default';

	if (title === '•') {
		name = 'notification-dot';
	} else if (count > 0) {
		name = count > 9 ? 'notification-plus-9' : `notification-${ String(count) }`;
	}

	return nativeImage.createFromPath(`${ iconsetsPath }/${ iconset }/${ name }.ico`);
}

export function getIconImage({ badge: { title, count } }) {
	const iconsetsPath = `${ __dirname }/public/images/tray`;

	if (process.platform === 'darwin') {
		return getIconImageDarwin({ iconsetsPath, title, count });
	}

	if (process.platform === 'linux') {
		return getIconImageLinux({ iconsetsPath, title, count });
	}

	if (process.platform === 'win32') {
		return getIconImageWin32({ iconsetsPath, title, count });
	}

	return null;
}
