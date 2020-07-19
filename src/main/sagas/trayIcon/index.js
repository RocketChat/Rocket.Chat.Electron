import { app, nativeTheme, Tray, Menu } from 'electron';
import { t } from 'i18next';
import { createSelector, createStructuredSelector } from 'reselect';
import { select, takeEvery, getContext } from 'redux-saga/effects';

import { getTrayIconPath, getAppIconPath } from '../../../icons';
import {
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../../actions';
import { eventEmitterChannel, storeChangeChannel } from '../../channels';

const selectAppName = () => app.name;
const selectIsMainWindowVisible = ({ mainWindowState: { visible } }) => visible;
const selectIsTrayIconEnabled = ({ isTrayIconEnabled }) => isTrayIconEnabled;

const selectBadges = ({ servers }) => servers.map(({ badge }) => badge);
const selectBadge = createSelector(selectBadges, (badges) => {
	const mentionCount = badges
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
	return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
});

const selectIsDarkModeEnabled = () => nativeTheme.shouldUseDarkColors;

const selectImage = createSelector(
	[selectBadge, selectIsDarkModeEnabled],
	(badge, isDarkModeEnabled) => getTrayIconPath({ badge, dark: isDarkModeEnabled }),
);

const selectTitle = createSelector(
	selectBadge,
	(badge) => (Number.isInteger(badge) ? String(badge) : ''),
);

const selectToolTip = createSelector(
	[selectAppName, selectBadge],
	(appName, badge) => {
		if (badge === '•') {
			return t('tray.tooltip.unreadMessage', { appName });
		}

		if (Number.isInteger(badge)) {
			return t('tray.tooltip.unreadMention', { appName, count: badge });
		}

		return t('tray.tooltip.noUnreadMessage', { appName });
	},
);

export function *trayIconSaga() {
	let trayIcon = null;

	const store = yield getContext('store');

	yield takeEvery(storeChangeChannel(store, selectIsTrayIconEnabled), function *([isTrayIconEnabled]) {
		if (!isTrayIconEnabled) {
			if (trayIcon) {
				trayIcon.destroy();
				trayIcon = null;
			}

			return;
		}

		if (trayIcon) {
			return;
		}

		const image = yield select(selectImage);
		trayIcon = new Tray(image);
		trayIcon.addListener('click', () => {
			const isMainWindowVisible = selectIsMainWindowVisible(store.getState());
			store.dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible });
		});
		trayIcon.addListener('balloon-click', () => {
			const isMainWindowVisible = selectIsMainWindowVisible(store.getState());
			store.dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible });
		});
		trayIcon.addListener('right-click', (event, bounds) => {
			trayIcon.popUpContextMenu(undefined, bounds);
		});
	});

	yield takeEvery(storeChangeChannel(store, selectImage), ([image]) => {
		if (!trayIcon) {
			return;
		}

		trayIcon.setImage(image);
	});

	const nativeThemeUpdatedEvent = eventEmitterChannel(nativeTheme, 'updated');

	yield takeEvery(nativeThemeUpdatedEvent, function *() {
		if (!trayIcon) {
			return;
		}

		const image = yield select(selectImage);
		trayIcon.setImage(image);
	});

	yield takeEvery(storeChangeChannel(store, selectTitle), function *([title]) {
		if (!trayIcon) {
			return;
		}

		trayIcon.setTitle(title);
	});

	yield takeEvery(storeChangeChannel(store, selectToolTip), function *([toolTip]) {
		if (!trayIcon) {
			return;
		}

		trayIcon.setToolTip(toolTip);
	});

	const selectMenuTemplate = createSelector(selectIsMainWindowVisible, (isMainWindowVisible) => [
		{
			label: isMainWindowVisible ? t('tray.menu.hide') : t('tray.menu.show'),
			click: () => store.dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible }),
		},
		{
			label: t('tray.menu.quit'),
			click: () => store.dispatch({ type: TRAY_ICON_QUIT_CLICKED }),
		},
	]);

	yield takeEvery(storeChangeChannel(store, selectMenuTemplate), function *([menuTemplate]) {
		if (!trayIcon) {
			return;
		}

		const menu = Menu.buildFromTemplate(menuTemplate);
		trayIcon.setContextMenu(menu);
	});

	yield takeEvery(storeChangeChannel(store, createStructuredSelector({
		appName: selectAppName,
		isMainWindowVisible: selectIsMainWindowVisible,
	})), function *([value, prevValue]) {
		const { appName, isMainWindowVisible } = value;
		const { isMainWindowVisible: prevIsMainWindowVisible } = prevValue ?? [];

		if (!prevIsMainWindowVisible || isMainWindowVisible) {
			return;
		}

		trayIcon.displayBalloon({
			icon: getAppIconPath(),
			title: t('tray.balloon.stillRunning.title', { appName }),
			content: t('tray.balloon.stillRunning.content', { appName }),
		});
	});
}
