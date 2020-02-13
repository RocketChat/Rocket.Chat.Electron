import { remote } from 'electron';
import React, { useEffect, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

import { getAppIconPath, getTrayIconPath } from '../../icons';
import { useSaga } from '../SagaMiddlewareProvider';
import { WindowDragBar, Wrapper, GlobalStyles } from './styles';
import { mainWindowStateSaga } from './sagas';

export function MainWindow({
	browserWindow = remote.getCurrentWindow(),
	children,
}) {
	useLayoutEffect(() => {
		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = `${ remote.app.getAppPath() }/app/icons/rocketchat.css`;
		document.head.append(linkElement);
	}, []);

	const badge = useSelector(({ isTrayIconEnabled, servers }) => {
		if (isTrayIconEnabled) {
			return undefined;
		}

		const badges = servers.map(({ badge }) => badge);
		const mentionCount = badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
	});

	useEffect(() => {
		if (process.platform !== 'linux' && process.platform !== 'win32') {
			return;
		}

		const image = badge === undefined ? getAppIconPath() : getTrayIconPath({ badge });
		browserWindow.setIcon(image);
	}, [badge, browserWindow]);

	useEffect(() => {
		if (process.platform !== 'win32') {
			return;
		}

		const count = Number.isInteger(badge) ? badge : 0;
		browserWindow.flashFrame(!browserWindow.isFocused() && count > 0);
	}, [badge, browserWindow]);

	useSaga(mainWindowStateSaga, [browserWindow]);

	return <>
		<GlobalStyles />
		<Wrapper>
			{process.platform === 'darwin' && <WindowDragBar />}
			{children}
		</Wrapper>
	</>;
}
