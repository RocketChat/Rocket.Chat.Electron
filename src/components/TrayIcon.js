import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getTrayIconPath } from '../icons';
import {
	TRAY_ICON_DESTROYED,
	TRAY_ICON_CREATED,
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../actions';

const appName = remote.app.name;

export function TrayIcon() {
	const isMainWindowToBeShown = useSelector(({ mainWindowState: { visible, focused } }) => !visible || !focused);
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

	const trayIconRef = useRef();

	const handleThemeUpdate = () => {
		if (!trayIconRef.current) {
			return;
		}

		trayIconRef.current.setImage(getTrayIconPath({ badge }));
	};

	const getIconTitle = () => (Number.isInteger(badge) ? String(badge) : '');

	const getIconTooltip = () => {
		if (badge === '•') {
			return t('tray.tooltip.unreadMessage', { appName });
		}

		if (Number.isInteger(badge)) {
			return t('tray.tooltip.unreadMention', { appName, count: badge });
		}

		return t('tray.tooltip.noUnreadMessage', { appName });
	};

	const createContextMenuTemplate = () => [
		{
			label: isMainWindowToBeShown ? t('tray.menu.show') : t('tray.menu.hide'),
			click: () => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown }),
		},
		{
			label: t('tray.menu.quit'),
			click: () => dispatch({ type: TRAY_ICON_QUIT_CLICKED }),
		},
	];

	const createIcon = () => {
		const image = getTrayIconPath({ badge });

		if (trayIconRef.current) {
			trayIconRef.current.setImage(image);
			return;
		}

		trayIconRef.current = new remote.Tray(image);

		if (process.platform === 'darwin') {
			remote.nativeTheme.addListener('updated', handleThemeUpdate);
		}

		trayIconRef.current.addListener('click', () => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown }));
		trayIconRef.current.addListener('right-click', (event, bounds) => trayIconRef.current.popUpContextMenu(undefined, bounds));

		dispatch({ type: TRAY_ICON_CREATED });
	};

	const destroyIcon = () => {
		if (!trayIconRef.current) {
			return;
		}

		if (process.platform === 'darwin') {
			remote.nativeTheme.off('updated', handleThemeUpdate);
		}

		trayIconRef.current.destroy();
		trayIconRef.current = null;
		dispatch({ type: TRAY_ICON_DESTROYED });
	};

	useEffect(() => {
		if (!isTrayIconEnabled) {
			destroyIcon({ dispatch });
			return;
		}

		createIcon();

		trayIconRef.current.setToolTip(getIconTooltip());

		if (process.platform === 'darwin') {
			trayIconRef.current.setTitle(getIconTitle());
		}

		const template = createContextMenuTemplate();
		const menu = remote.Menu.buildFromTemplate(template);
		trayIconRef.current.setContextMenu(menu);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		badge,
		isMainWindowToBeShown,
		isTrayIconEnabled,
		dispatch,
	]);

	useEffect(() => () => {
		destroyIcon();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return null;
}
