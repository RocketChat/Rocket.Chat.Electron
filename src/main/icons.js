import { app, nativeTheme } from 'electron';

const getTrayIconSet = ({ platform, dark }) => {
	if (platform === 'darwin') {
		return `darwin${ dark ? '-dark' : '' }`;
	}

	return platform;
};

const getTrayIconName = ({ badge, platform }) => {
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
};

const getTrayIconExtension = ({ platform }) => {
	if (platform === 'win32') {
		return 'ico';
	}

	return 'png';
};

export const getAppIconPath = () => `${ app.getAppPath() }/app/public/images/icon.png`;

export const getTrayIconPath = ({ badge, platform, dark } = {}) => {
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
	return `${ app.getAppPath() }/app/public/images/tray/${ iconset }/${ name }.${ extension }`;
};
