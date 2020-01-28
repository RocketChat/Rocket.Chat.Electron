import { remote } from 'electron';
import { t } from 'i18next';
import { useEffect, useRef } from 'react';

import { getTrayIconPath } from './icon';
import {
	TRAY_ICON_DESTROYED,
	TRAY_ICON_CREATED,
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from './actions';

export function Tray({
	appName = remote.app.name,
	badge,
	isMainWindowVisible,
	showIcon,
	dispatch,
}) {
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
			label: !isMainWindowVisible ? t('tray.menu.show') : t('tray.menu.hide'),
			click: () => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible }),
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
			remote.nativeTheme.on('updated', handleThemeUpdate);
		}

		trayIconRef.current.on('click', () => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible }));
		trayIconRef.current.on('right-click', (event, bounds) => trayIconRef.current.popUpContextMenu(undefined, bounds));

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
		if (!showIcon) {
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
	}, [
		badge,
		isMainWindowVisible,
		showIcon,
		dispatch,
	]);

	useEffect(() => () => {
		destroyIcon();
	}, []);

	return null;
}
