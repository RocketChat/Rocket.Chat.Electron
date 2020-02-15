import { remote } from 'electron';
import React, { useEffect, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { getAppIconPath, getTrayIconPath } from '../../icons';
import { useSaga } from '../SagaMiddlewareProvider';
import { WindowDragBar, Wrapper, GlobalStyles } from './styles';
import { mainWindowStateSaga } from './sagas';
import { MAIN_WINDOW_WEBCONTENTS_FOCUSED } from '../../actions';

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

	const dispatch = useDispatch();

	useEffect(() => {
		const fetchAndDispatchFocusedWebContentsId = () => {
			const webContents = document.activeElement.matches('webview')
				? document.activeElement.getWebContents()
				: browserWindow.webContents;

			if (webContents.isDevToolsFocused()) {
				dispatch({ type: MAIN_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
				return;
			}

			dispatch({ type: MAIN_WINDOW_WEBCONTENTS_FOCUSED, payload: webContents.id });
		};

		document.addEventListener('focus', fetchAndDispatchFocusedWebContentsId, true);
		document.addEventListener('blur', fetchAndDispatchFocusedWebContentsId, true);

		fetchAndDispatchFocusedWebContentsId();

		return () => {
			document.removeEventListener('focus', fetchAndDispatchFocusedWebContentsId);
			document.removeEventListener('blur', fetchAndDispatchFocusedWebContentsId);
		};
	}, [browserWindow, dispatch]);

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
