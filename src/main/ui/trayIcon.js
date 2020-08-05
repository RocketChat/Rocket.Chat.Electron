import { app, nativeTheme, Menu, Tray } from 'electron';
import { t } from 'i18next';

import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectIsTrayIconEnabled,
	selectIsMainWindowVisible,
	selectGlobalBadge,
} from '../selectors';

const createTrayIcon = (reduxStore, rootWindow) => {
	const image = getTrayIconPath({ badge: null, dark: nativeTheme.shouldUseDarkColors });

	const trayIcon = new Tray(image);

	trayIcon.addListener('click', () => {
		const isMainWindowVisible = selectIsMainWindowVisible(reduxStore.getState());

		if (isMainWindowVisible) {
			rootWindow.hide();
			return;
		}

		rootWindow.show();
	});

	trayIcon.addListener('balloon-click', () => {
		const isMainWindowVisible = selectIsMainWindowVisible(reduxStore.getState());

		if (isMainWindowVisible) {
			rootWindow.hide();
			return;
		}

		rootWindow.show();
	});

	trayIcon.addListener('right-click', (event, bounds) => {
		trayIcon.popUpContextMenu(undefined, bounds);
	});

	return trayIcon;
};

const updateTrayIconImage = (trayIcon, badge, dark) => {
	const image = getTrayIconPath({ badge, dark });
	trayIcon.setImage(image);
};

const updateTrayIconTitle = (trayIcon, globalBadge) => {
	const title = Number.isInteger(globalBadge) ? String(globalBadge) : '';
	trayIcon.setTitle(title);
};

const updateTrayIconToolTip = (trayIcon, globalBadge) => {
	if (globalBadge === '•') {
		trayIcon.setToolTip(t('tray.tooltip.unreadMessage', { appName: app.name }));
		return;
	}

	if (Number.isInteger(globalBadge)) {
		trayIcon.setToolTip(t('tray.tooltip.unreadMention', { appName: app.name, count: globalBadge }));
		return;
	}

	trayIcon.setToolTip(t('tray.tooltip.noUnreadMessage', { appName: app.name }));
};

const warnStillRunning = (trayIcon) => {
	trayIcon.displayBalloon({
		icon: getAppIconPath(),
		title: t('tray.balloon.stillRunning.title', { appName: app.name }),
		content: t('tray.balloon.stillRunning.content', { appName: app.name }),
	});
};

const manageTrayIcon = async (reduxStore, rootWindow) => {
	const trayIcon = await createTrayIcon(reduxStore, rootWindow);

	let prevGlobalBadge;
	const unwatchGlobalBadge = reduxStore.subscribe(() => {
		const globalBadge = selectGlobalBadge(reduxStore.getState());
		if (prevGlobalBadge !== globalBadge) {
			updateTrayIconImage(trayIcon, globalBadge, nativeTheme.shouldUseDarkColors);
			updateTrayIconTitle(trayIcon, globalBadge);
			updateTrayIconToolTip(trayIcon, globalBadge);
			prevGlobalBadge = globalBadge;
		}
	});

	let prevIsRootWindowVisible;
	const unwatchIsRootWindowVisible = reduxStore.subscribe(() => {
		const isRootWindowVisible = selectIsMainWindowVisible(reduxStore.getState());
		if (prevIsRootWindowVisible !== isRootWindowVisible) {
			const menuTemplate = [
				{
					label: isRootWindowVisible ? t('tray.menu.hide') : t('tray.menu.show'),
					click: () => {
						const isMainWindowVisible = selectIsMainWindowVisible(reduxStore.getState());

						if (isMainWindowVisible) {
							rootWindow.hide();
							return;
						}

						rootWindow.show();
					},
				},
				{
					label: t('tray.menu.quit'),
					click: () => {
						app.quit();
					},
				},
			];

			const menu = Menu.buildFromTemplate(menuTemplate);
			trayIcon.setContextMenu(menu);

			if (prevIsRootWindowVisible && !isRootWindowVisible && process.platform === 'win32') {
				warnStillRunning(trayIcon);
			}
			prevIsRootWindowVisible = isRootWindowVisible;
		}
	});

	const handleNativeThemeUpdatedEvent = () => {
		const globalBadge = selectGlobalBadge(reduxStore.getState());
		updateTrayIconImage(trayIcon, globalBadge, nativeTheme.shouldUseDarkColors);
		updateTrayIconTitle(trayIcon, globalBadge);
		updateTrayIconToolTip(trayIcon, globalBadge);
	};

	nativeTheme.addListener('updated', handleNativeThemeUpdatedEvent);

	return () => {
		unwatchGlobalBadge();
		unwatchIsRootWindowVisible();
		nativeTheme.removeListener('updated', handleNativeThemeUpdatedEvent);
		trayIcon.destroy();
	};
};

export const setupTrayIcon = (reduxStore, rootWindow) => {
	let trayIconTask = null;

	let prevIsTrayIconEnabled;
	reduxStore.subscribe(() => {
		const isTrayIconEnabled = selectIsTrayIconEnabled(reduxStore.getState());

		if (prevIsTrayIconEnabled !== isTrayIconEnabled) {
			if (!trayIconTask && isTrayIconEnabled) {
				trayIconTask = manageTrayIcon(reduxStore, rootWindow);
			} else if (trayIconTask && !isTrayIconEnabled) {
				trayIconTask.then((cleanUp) => cleanUp());
				trayIconTask = null;
			}

			prevIsTrayIconEnabled = isTrayIconEnabled;
		}
	});
};
