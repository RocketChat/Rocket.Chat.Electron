import { app, nativeTheme, Menu, Tray, BrowserWindow } from 'electron';
import i18next from 'i18next';
import { Store } from 'redux';

import {
	selectIsTrayIconEnabled,
	selectIsMainWindowVisible,
	selectGlobalBadge,
} from '../../selectors';
import { getTrayIconPath, getAppIconPath } from '../icons';

const { t } = i18next;

const createTrayIcon = (reduxStore: Store, rootWindow: BrowserWindow): Tray => {
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

	trayIcon.addListener('right-click', (_event, bounds) => {
		trayIcon.popUpContextMenu(undefined, bounds);
	});

	return trayIcon;
};

const updateTrayIconImage = (trayIcon: Tray, badge: '•' | number, dark:boolean): void => {
	const image = getTrayIconPath({ badge, dark });
	trayIcon.setImage(image);
};

const updateTrayIconTitle = (trayIcon: Tray, globalBadge: '•' | number): void => {
	const title = Number.isInteger(globalBadge) ? String(globalBadge) : '';
	trayIcon.setTitle(title);
};

const updateTrayIconToolTip = (trayIcon:Tray, globalBadge: '•' | number): void => {
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

const warnStillRunning = (trayIcon: Tray): void => {
	trayIcon.displayBalloon({
		icon: getAppIconPath(),
		title: t('tray.balloon.stillRunning.title', { appName: app.name }),
		content: t('tray.balloon.stillRunning.content', { appName: app.name }),
	});
};

const manageTrayIcon = async (reduxStore: Store, rootWindow: BrowserWindow): Promise<() => void> => {
	const trayIcon = createTrayIcon(reduxStore, rootWindow);

	let prevGlobalBadge: '•' | number;
	const unwatchGlobalBadge = reduxStore.subscribe(() => {
		const globalBadge = selectGlobalBadge(reduxStore.getState());
		if (prevGlobalBadge !== globalBadge) {
			updateTrayIconImage(trayIcon, globalBadge, nativeTheme.shouldUseDarkColors);
			updateTrayIconTitle(trayIcon, globalBadge);
			updateTrayIconToolTip(trayIcon, globalBadge);
			prevGlobalBadge = globalBadge;
		}
	});

	let prevIsRootWindowVisible: boolean;
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

	const handleNativeThemeUpdatedEvent = (): void => {
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

export const setupTrayIcon = (reduxStore: Store, rootWindow: BrowserWindow): void => {
	let trayIconTask = null;

	let prevIsTrayIconEnabled: boolean;
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
