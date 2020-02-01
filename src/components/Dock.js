import { remote } from 'electron';
import { useRef, useEffect } from 'react';

export function Dock({
	badge = null,
	dock = remote.app.dock,
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

	return null;
}
