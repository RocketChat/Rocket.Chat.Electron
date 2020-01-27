import { remote } from 'electron';
import { useRef, useEffect } from 'react';

import { getAppIconPath, getTrayIconPath } from './icon';

export function Dock({
	badge = null,
	browserWindow = remote.getCurrentWindow(),
	dock = remote.app.dock,
	hasTrayIcon = false,
}) {
	useEffect(() => {
		if (process.platform !== 'darwin') {
			return;
		}

		const getBadgeText = (badge) => {
			if (badge === '•') {
				return '•';
			}

			if (Number.isInteger(badge)) {
				return String(badge);
			}

			return '';
		};

		dock.setBadge(getBadgeText(badge));
	}, [badge]);

	const prevBadgeRef = useRef();

	useEffect(() => {
		if (process.platform !== 'darwin') {
			return;
		}

		const { current: prevBadge } = prevBadgeRef;
		const count = Number.isInteger(badge) ? badge : 0;
		const previousCount = Number.isInteger(prevBadge) ? prevBadge : 0;
		if (count > 0 && previousCount === 0) {
			dock.bounce();
		}
	}, [badge]);

	useEffect(() => {
		prevBadgeRef.current = badge;
	}, [badge]);

	useEffect(() => {
		if (process.platform !== 'linux' && process.platform !== 'win32') {
			return;
		}

		const image = hasTrayIcon ? getAppIconPath() : getTrayIconPath({ badge });
		browserWindow.setIcon(image);
	}, [badge, hasTrayIcon]);

	useEffect(() => {
		if (process.platform !== 'win32') {
			return;
		}

		const count = Number.isInteger(badge) ? badge : 0;
		browserWindow.flashFrame(!browserWindow.isFocused() && count > 0);
	}, [badge]);

	return null;
}
