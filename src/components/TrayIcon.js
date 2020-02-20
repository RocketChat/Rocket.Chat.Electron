import { remote } from 'electron';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { select, takeEvery } from 'redux-saga/effects';

import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
	MAIN_WINDOW_STATE_CHANGED,
} from '../actions';
import { Menu } from './electron/Menu';
import { MenuItem } from './electron/MenuItem';
import { useSaga } from './SagaMiddlewareProvider';
import { createEventChannelFromEmitter } from '../sagaUtils';

export function TrayIcon() {
	const appName = remote.app.name;
	const isMainWindowToBeShown = useSelector(({ mainWindowState: { visible } }) => !visible);
	const isTrayIconEnabled = useSelector(({ isTrayIconEnabled }) => isTrayIconEnabled);

	const badge = useSelector(({ servers }) => {
		const badges = servers.map(({ badge }) => badge);
		const mentionCount = badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
	});

	const dispatch = useDispatch();
	const { t } = useTranslation();

	const innerRef = useRef();

	const [isDarkModeEnabled, setDarkModeEnabled] = useState(remote.nativeTheme.shouldUseDarkColors);
	useSaga(function *(nativeTheme) {
		const nativeThemeUpdatedEvent = createEventChannelFromEmitter(nativeTheme, 'updated');

		yield takeEvery(nativeThemeUpdatedEvent, function *() {
			setDarkModeEnabled(nativeTheme.shouldUseDarkColors);
		});
	}, [remote.nativeTheme]);

	const image = useMemo(() => getTrayIconPath({ badge, dark: isDarkModeEnabled }), [badge, isDarkModeEnabled]);

	const title = useMemo(() => (Number.isInteger(badge) ? String(badge) : ''), [badge]);

	const toolTip = useMemo(() => {
		if (badge === '•') {
			return t('tray.tooltip.unreadMessage', { appName });
		}

		if (Number.isInteger(badge)) {
			return t('tray.tooltip.unreadMention', { appName, count: badge });
		}

		return t('tray.tooltip.noUnreadMessage', { appName });
	}, [appName, badge, t]);

	const [menu, setMenu] = useState(null);

	const onClickRef = useRef();
	useEffect(() => {
		onClickRef.current = () => {
			dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown });
		};
	}, [dispatch, isMainWindowToBeShown]);

	const onRightClickRef = useRef();
	useEffect(() => {
		onRightClickRef.current = (event, bounds) => {
			innerRef.current.popUpContextMenu(undefined, bounds);
		};
	}, []);

	const imageRef = useRef(image);
	useEffect(() => {
		if (!isTrayIconEnabled) {
			return;
		}

		innerRef.current = new remote.Tray(imageRef.current);
		innerRef.current.addListener('click', (...args) => onClickRef.current && (0, onClickRef.current)(...args));
		innerRef.current.addListener('balloon-click', (...args) => onClickRef.current && (0, onClickRef.current)(...args));
		innerRef.current.addListener('right-click', (...args) => onRightClickRef.current && (0, onRightClickRef.current)(...args));

		return () => {
			innerRef.current.destroy();
		};
	}, [isTrayIconEnabled]);

	useEffect(() => {
		if (!innerRef.current) {
			return;
		}

		innerRef.current.setImage(image);
	}, [image]);

	useEffect(() => {
		if (!innerRef.current) {
			return;
		}

		innerRef.current.setTitle(title);
	}, [title]);

	useEffect(() => {
		if (!innerRef.current) {
			return;
		}

		innerRef.current.setToolTip(toolTip);
	}, [toolTip]);

	useEffect(() => {
		if (!innerRef.current) {
			return;
		}

		innerRef.current.setContextMenu(menu);
	}, [menu]);

	useSaga(function *(appName, t) {
		let prevIsMainWindowVisible = yield select(({ mainWindowState: { visible } }) => visible);
		yield takeEvery(MAIN_WINDOW_STATE_CHANGED, function *() {
			const isMainWindowVisible = yield select(({ mainWindowState: { visible } }) => visible);

			if (prevIsMainWindowVisible && !isMainWindowVisible) {
				innerRef.current.displayBalloon({
					icon: getAppIconPath(),
					title: t('tray.balloon.stillRunning.title', { appName }),
					content: t('tray.balloon.stillRunning.content', { appName }),
				});
			}

			prevIsMainWindowVisible = isMainWindowVisible;
		});
	}, [appName, t]);

	return <>
		<Menu ref={setMenu}>
			<MenuItem
				label={isMainWindowToBeShown ? t('tray.menu.show') : t('tray.menu.hide')}
				onClick={() => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown })}
			/>
			<MenuItem
				label={t('tray.menu.quit')}
				onClick={() => dispatch({ type: TRAY_ICON_QUIT_CLICKED })}
			/>
		</Menu>
	</>;
}
