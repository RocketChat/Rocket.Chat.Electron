import { remote } from 'electron';
import { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

const { dock } = remote.app;

export function Dock() {
	const badge = useSelector(({ servers }) => {
		const badges = servers.map(({ badge }) => badge);
		const mentionCount = badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
	});

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
	// eslint-disable-next-line react-hooks/exhaustive-deps
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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [badge]);

	useEffect(() => {
		prevBadgeRef.current = badge;
	}, [badge]);

	return null;
}
