import { app, nativeTheme, Menu, Tray } from 'electron';
import { t } from 'i18next';
import { channel } from 'redux-saga';
import { put, select, takeEvery, cancel, call, take, spawn } from 'redux-saga/effects';

import {
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../actions';
import { getPlatform } from '../app';
import { eventEmitterChannel } from '../channels';
import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectIsTrayIconEnabled,
	selectIsMainWindowVisible,
	selectGlobalBadge,
} from '../selectors';
import { watchValue, waitAndCleanUp } from '../sagas/utils';

const createTrayIcon = (eventsChannel) => {
	const image = getTrayIconPath({ badge: null, dark: nativeTheme.shouldUseDarkColors });

	const trayIcon = new Tray(image);

	trayIcon.addListener('click', () => {
		eventsChannel.put(function *() {
			const isMainWindowVisible = yield select(selectIsMainWindowVisible);
			yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible });
		});
	});

	trayIcon.addListener('balloon-click', () => {
		eventsChannel.put(function *() {
			const isMainWindowVisible = yield select(selectIsMainWindowVisible);
			yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isMainWindowVisible });
		});
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

const updateTrayIconMenu = (trayIcon, eventsChannel, isRootWindowVisible) => {
	const menuTemplate = [
		{
			label: isRootWindowVisible ? t('tray.menu.hide') : t('tray.menu.show'),
			click: () => {
				eventsChannel.put(function *() {
					const isRootWindowVisible = yield select(selectIsMainWindowVisible);
					yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: !isRootWindowVisible });
				});
			},
		},
		{
			label: t('tray.menu.quit'),
			click: () => {
				eventsChannel.put(function *() {
					yield put({ type: TRAY_ICON_QUIT_CLICKED });
				});
			},
		},
	];

	const menu = Menu.buildFromTemplate(menuTemplate);
	trayIcon.setContextMenu(menu);
};

const warnStillRunning = (trayIcon) => {
	trayIcon.displayBalloon({
		icon: getAppIconPath(),
		title: t('tray.balloon.stillRunning.title', { appName: app.name }),
		content: t('tray.balloon.stillRunning.content', { appName: app.name }),
	});
};

function *watchUpdates(trayIcon, eventsChannel) {
	yield watchValue(selectGlobalBadge, function *([globalBadge]) {
		yield call(updateTrayIconImage, trayIcon, globalBadge, nativeTheme.shouldUseDarkColors);
		yield call(updateTrayIconTitle, trayIcon, globalBadge);
		yield call(updateTrayIconToolTip, trayIcon, globalBadge);
	});

	yield watchValue(selectIsMainWindowVisible, function *([isRootWindowVisible, prevIsRootWindowVisible]) {
		yield call(updateTrayIconMenu, trayIcon, eventsChannel, isRootWindowVisible);

		const platform = yield call(getPlatform);
		if (prevIsRootWindowVisible && !isRootWindowVisible && platform === 'win32') {
			yield call(warnStillRunning, trayIcon);
		}
	});
}

function *watchEvents(trayIcon, eventsChannel) {
	const nativeThemeUpdatedChannel = yield call(eventEmitterChannel, nativeTheme, 'updated');

	yield takeEvery(nativeThemeUpdatedChannel, function *() {
		const globalBadge = yield select(selectGlobalBadge);
		yield call(updateTrayIconImage, trayIcon, globalBadge, nativeTheme.shouldUseDarkColors);
		yield call(updateTrayIconTitle, trayIcon, globalBadge);
		yield call(updateTrayIconToolTip, trayIcon, globalBadge);
	});

	yield takeEvery(eventsChannel, function *(saga) {
		yield *saga();
	});
}

function *manageTrayIcon(eventsChannel) {
	const trayIcon = yield call(createTrayIcon, eventsChannel);
	const nativeThemeUpdatedChannel = yield call(eventEmitterChannel, nativeTheme, 'updated');

	yield *watchUpdates(trayIcon, eventsChannel);
	yield *watchEvents(trayIcon, eventsChannel);

	yield waitAndCleanUp(() => {
		nativeThemeUpdatedChannel.close();
		trayIcon.destroy();
	});
}

export function *setupTrayIcon({ eventsChannel = channel() } = {}) {
	let trayIconTask = null;

	let prevIsTrayIconEnabled;

	while (true) {
		const isTrayIconEnabled = yield select(selectIsTrayIconEnabled);

		if (isTrayIconEnabled !== prevIsTrayIconEnabled) {
			if (!trayIconTask && isTrayIconEnabled) {
				trayIconTask = yield spawn(manageTrayIcon, eventsChannel);
			} else if (trayIconTask && !isTrayIconEnabled) {
				yield cancel(trayIconTask);
				trayIconTask = null;
			}
		}

		prevIsTrayIconEnabled = isTrayIconEnabled;
		yield take();
	}
}
