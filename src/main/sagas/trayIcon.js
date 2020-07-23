import { app, nativeTheme, Menu, Tray } from 'electron';
import { t } from 'i18next';
import { getContext, put, select, takeEvery } from 'redux-saga/effects';
import { channel } from 'redux-saga';
import { createSelector } from 'reselect';

import {
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../actions';
import { eventEmitterChannel, storeChangeChannel } from '../channels';
import { getTrayIconPath, getAppIconPath } from '../icons';
import { selectIsTrayIconEnabled, selectIsMainWindowVisible, selectGlobalBadge } from '../selectors';

const selectTitle = createSelector(selectGlobalBadge, (badge) => (Number.isInteger(badge) ? String(badge) : ''));

const selectToolTip = createSelector([selectGlobalBadge], (badge) => {
	if (badge === '•') {
		return t('tray.tooltip.unreadMessage', { appName: app.name });
	}

	if (Number.isInteger(badge)) {
		return t('tray.tooltip.unreadMention', { appName: app.name, count: badge });
	}

	return t('tray.tooltip.noUnreadMessage', { appName: app.name });
});

const toggleClickChannel = channel();
const quitClickChannel = channel();

export function *handleTrayIcon() {
	const store = yield getContext('reduxStore');

	let trayIcon = null;

	const selectImage = createSelector([selectGlobalBadge], (badge) =>
		getTrayIconPath({ badge, dark: nativeTheme.shouldUseDarkColors }));

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
			toggleClickChannel.put(true);
		});

		trayIcon.addListener('balloon-click', () => {
			toggleClickChannel.put(true);
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

	yield takeEvery(eventEmitterChannel(nativeTheme, 'updated'), function *() {
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

	yield takeEvery(storeChangeChannel(store, selectIsMainWindowVisible), function *([isMainWindowVisible]) {
		if (!trayIcon) {
			return;
		}

		const menuTemplate = [
			{
				label: isMainWindowVisible ? t('tray.menu.hide') : t('tray.menu.show'),
				click: () => {
					toggleClickChannel.put(true);
				},
			},
			{
				label: t('tray.menu.quit'),
				click: () => {
					quitClickChannel.put(true);
				},
			},
		];

		const menu = Menu.buildFromTemplate(menuTemplate);
		trayIcon.setContextMenu(menu);
	});

	yield takeEvery(storeChangeChannel(store, selectIsMainWindowVisible), function *([
		isMainWindowVisible,
		prevIsMainWindowVisible,
	]) {
		if (!trayIcon) {
			return;
		}

		if (!prevIsMainWindowVisible || isMainWindowVisible) {
			return;
		}

		trayIcon.displayBalloon({
			icon: getAppIconPath(),
			title: t('tray.balloon.stillRunning.title', { appName: app.name }),
			content: t('tray.balloon.stillRunning.content', { appName: app.name }),
		});
	});

	yield takeEvery(toggleClickChannel, function *() {
		const isMainWindowVisible = yield select(selectIsMainWindowVisible);
		yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible });
	});

	yield takeEvery(quitClickChannel, function *() {
		yield put({ type: TRAY_ICON_QUIT_CLICKED });
	});
}
