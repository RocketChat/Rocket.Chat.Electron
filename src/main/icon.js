import { nativeImage, nativeTheme } from 'electron';


function getTrayIconSet({ platform, dark }) {
	if (platform === 'darwin') {
		return `darwin${ dark ? '-dark' : '' }`;
	}

	return platform;
}

function getTrayIconName({ badge, platform }) {
	if (platform === 'darwin') {
		return badge ? 'notification' : 'default';
	}

	if (badge === '•') {
		return 'notification-dot';
	}

	if (Number.isInteger(badge)) {
		return badge > 9 ? 'notification-plus-9' : `notification-${ String(badge) }`;
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

export function getTrayIconPath({ badge, platform, dark } = {}) {
	if (typeof platform === 'undefined') {
		platform = process.platform;
	}

	if (platform === 'darwin' && typeof dark === 'undefined') {
		dark = nativeTheme.shouldUseDarkColors;
	}

	const params = { badge, platform, dark };
	const iconset = getTrayIconSet(params);
	const name = getTrayIconName(params);
	const extension = getTrayIconExtension(params);
	return `public/images/tray/${ iconset }/${ name }.${ extension }`;
}

export function getAppIconImage() {
	return nativeImage.createFromPath(`${ __dirname }/${ getAppIconPath() }`);
}

export function getTrayIconImage({ badge, platform, dark } = {}) {
	return nativeImage.createFromPath(`${ __dirname }/${ getTrayIconPath({ badge, platform, dark }) }`);
}
