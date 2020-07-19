import { app, nativeTheme, Tray, Menu } from 'electron';
import { t } from 'i18next';
import { createSelector } from 'reselect';
import { select, put, takeEvery } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';

import { runSaga, dispatch } from '../reduxStore';
import { getTrayIconPath, getAppIconPath } from '../../icons';
import { watch } from '../../sagaUtils';
import {
	TRAY_ICON_TOGGLE_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
	MAIN_WINDOW_STATE_CHANGED,
} from '../../actions';

const selectAppName = () => app.name;
const selectIsMainWindowToBeShown = ({ mainWindowState: { visible } }) => !visible;
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

const selectMenuTemplate = createSelector(selectIsMainWindowToBeShown, (isMainWindowToBeShown) => [
	{
		label: isMainWindowToBeShown ? t('tray.menu.show') : t('tray.menu.hide'),
		click: () => dispatch({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown }),
	},
	{
		label: t('tray.menu.quit'),
		click: () => dispatch({ type: TRAY_ICON_QUIT_CLICKED }),
	},
]);

function *trayIconSaga() {
	let trayIcon = null;

	yield watch(selectIsTrayIconEnabled, function *(isTrayIconEnabled) {
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
			runSaga(function *() {
				const isMainWindowToBeShown = yield select(selectIsMainWindowToBeShown);
				yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown });
			});
		});
		trayIcon.addListener('balloon-click', () => {
			runSaga(function *() {
				const isMainWindowToBeShown = yield select(selectIsMainWindowToBeShown);
				yield put({ type: TRAY_ICON_TOGGLE_CLICKED, payload: isMainWindowToBeShown });
			});
		});
		trayIcon.addListener('right-click', (event, bounds) => {
			trayIcon.popUpContextMenu(undefined, bounds);
		});
	});

	yield watch(selectImage, (image) => {
		if (!trayIcon) {
			return;
		}

		trayIcon.setImage(image);
	});

	const nativeThemeUpdatedEvent = eventChannel((emit) => {
		nativeTheme.addListener('updated', emit);

		return () => {
			nativeTheme.removeListener('updated', emit);
		};
	});

	yield takeEvery(nativeThemeUpdatedEvent, function *() {
		if (!trayIcon) {
			return;
		}

		const image = yield select(selectImage);
		trayIcon.setImage(image);
	});

	yield watch(selectTitle, function *(title) {
		if (!trayIcon) {
			return;
		}

		trayIcon.setTitle(title);
	});

	yield watch(selectToolTip, function *(toolTip) {
		if (!trayIcon) {
			return;
		}

		trayIcon.setToolTip(toolTip);
	});

	yield watch(selectMenuTemplate, function *(menuTemplate) {
		if (!trayIcon) {
			return;
		}

		const menu = Menu.buildFromTemplate(menuTemplate);
		trayIcon.setContextMenu(menu);
	});

	yield watch(selectAppName, function *(appName) {
		let prevIsMainWindowVisible = yield select(({ mainWindowState: { visible } }) => visible);

		yield takeEvery(MAIN_WINDOW_STATE_CHANGED, function *() {
			const isMainWindowVisible = yield select(({ mainWindowState: { visible } }) => visible);

			if (prevIsMainWindowVisible && !isMainWindowVisible) {
				trayIcon.displayBalloon({
					icon: getAppIconPath(),
					title: t('tray.balloon.stillRunning.title', { appName }),
					content: t('tray.balloon.stillRunning.content', { appName }),
				});
			}

			prevIsMainWindowVisible = isMainWindowVisible;
		});
	});
}

export const setupTrayIcon = () => {
	runSaga(trayIconSaga);
};
