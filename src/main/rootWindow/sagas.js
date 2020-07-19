import { app } from 'electron';
import { takeEvery, select, put, call } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	DEEP_LINK_TRIGGERED,
	MAIN_WINDOW_STATE_CHANGED,
	MAIN_WINDOW_WEBCONTENTS_FOCUSED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TRAY_ICON_QUIT_CLICKED,
	TRAY_ICON_TOGGLE_CLICKED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_UNREAD_CHANGED,
} from '../../actions';
import { getTrayIconPath, getAppIconPath } from '../../icons';
import { watch } from '../../sagaUtils';
import { eventEmitterChannel } from '../channels';
import { appActivateEvent, appBeforeQuitEvent, appSecondInstanceEvent } from '../channels/app';

const selectIsTrayIconEnabled = ({ isTrayIconEnabled }) => isTrayIconEnabled;

const selectBadges = ({ servers }) => servers.map(({ badge }) => badge);

const selectBadge = createSelector([selectIsTrayIconEnabled, selectBadges], (isTrayIconEnabled, badges) => {
	if (isTrayIconEnabled) {
		return undefined;
	}

	const mentionCount = badges
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
	return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
});

const selectIcon = createSelector(selectBadge, (badge) =>
	(badge === undefined ? getAppIconPath() : getTrayIconPath({ badge })));

const selectBadgeCount = createSelector(selectBadge, (badge) => (Number.isInteger(badge) ? badge : 0));

function *fetchAndDispatchWindowState(rootWindow) {
	const focused = rootWindow.isFocused();
	const visible = rootWindow.isVisible();
	const maximized = rootWindow.isMaximized();
	const minimized = rootWindow.isMinimized();
	const fullscreen = rootWindow.isFullScreen();
	const normal = rootWindow.isNormal();
	const bounds = rootWindow.getNormalBounds();

	yield put({
		type: MAIN_WINDOW_STATE_CHANGED,
		payload: {
			focused,
			visible,
			maximized,
			minimized,
			fullscreen,
			normal,
			bounds,
		},
	});
}

export function *rootWindowSaga(rootWindow) {
	if (process.platform === 'linux' || process.platform === 'win32') {
		yield watch(selectIcon, function *(icon) {
			rootWindow.setIcon(icon);
		});
	}

	if (process.platform === 'win32') {
		yield watch(selectBadgeCount, function *(badgeCount) {
			rootWindow.flashFrame(!rootWindow.isFocused() && badgeCount > 0);
		});
	}

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		app.relaunch({ args: process.argv.slice(1).concat('--disable-gpu') });
		app.exit();
	});

	yield takeEvery([
		MENU_BAR_QUIT_CLICKED,
		TRAY_ICON_QUIT_CLICKED,
	], function *() {
		app.quit();
	});

	yield takeEvery([
		DEEP_LINK_TRIGGERED,
		MENU_BAR_ABOUT_CLICKED,
		MENU_BAR_ADD_NEW_SERVER_CLICKED,
		MENU_BAR_GO_BACK_CLICKED,
		MENU_BAR_GO_FORWARD_CLICKED,
		MENU_BAR_RELOAD_SERVER_CLICKED,
		MENU_BAR_SELECT_SERVER_CLICKED,
		MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
		MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
		MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
		MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
		TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
		TOUCH_BAR_SELECT_SERVER_TOUCHED,
		WEBVIEW_FOCUS_REQUESTED,
	], function *() {
		rootWindow.show();
	});

	yield takeEvery(MENU_BAR_RESET_ZOOM_CLICKED, function *() {
		rootWindow.show();
		rootWindow.webContents.zoomLevel = 0;
	});

	yield takeEvery(MENU_BAR_ZOOM_IN_CLICKED, function *() {
		rootWindow.show();
		if (rootWindow.webContents.zoomLevel >= 9) {
			return;
		}
		rootWindow.webContents.zoomLevel++;
	});

	yield takeEvery(MENU_BAR_ZOOM_OUT_CLICKED, function *() {
		rootWindow.show();
		if (rootWindow.webContents.zoomLevel <= -9) {
			return;
		}
		rootWindow.webContents.zoomLevel--;
	});

	yield takeEvery(MENU_BAR_RELOAD_APP_CLICKED, function *() {
		rootWindow.show();
		rootWindow.reload();
	});

	yield takeEvery(MENU_BAR_TOGGLE_DEVTOOLS_CLICKED, function *() {
		rootWindow.show();
		rootWindow.toggleDevTools();
	});

	yield takeEvery(MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED, function *({ payload: enabled }) {
		rootWindow.show();
		rootWindow.setFullScreen(enabled);
	});

	yield takeEvery(TRAY_ICON_TOGGLE_CLICKED, function *({ payload: visible }) {
		if (visible) {
			rootWindow.show();
		} else {
			rootWindow.hide();
		}
	});

	yield takeEvery(WEBVIEW_UNREAD_CHANGED, function *({ payload: badge }) {
		const isShowWindowOnUnreadChangedEnabled = yield select(({ isShowWindowOnUnreadChangedEnabled }) =>
			isShowWindowOnUnreadChangedEnabled);
		if (!isShowWindowOnUnreadChangedEnabled || rootWindow.isFocused() || typeof badge !== 'number') {
			return;
		}

		rootWindow.showInactive();
		rootWindow.flashFrame(true);
	});

	const rootWindowEventChannel = (eventName) => eventEmitterChannel(rootWindow, eventName);

	const showEvent = rootWindowEventChannel('show');
	const hideEvent = rootWindowEventChannel('hide');
	const focusEvent = rootWindowEventChannel('focus');
	const blurEvent = rootWindowEventChannel('blur');
	const maximizeEvent = rootWindowEventChannel('maximize');
	const unmaximizeEvent = rootWindowEventChannel('unmaximize');
	const minimizeEvent = rootWindowEventChannel('minimize');
	const restoreEvent = rootWindowEventChannel('restore');
	const resizeEvent = rootWindowEventChannel('resize');
	const moveEvent = rootWindowEventChannel('move');
	const closeEvent = rootWindowEventChannel('close');
	const devtoolsFocusedEvent = rootWindowEventChannel('devtools-focused');

	yield takeEvery(showEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(hideEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(focusEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(blurEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(maximizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(unmaximizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(minimizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(restoreEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(resizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(moveEvent, fetchAndDispatchWindowState, rootWindow);

	yield call(fetchAndDispatchWindowState, rootWindow);

	yield takeEvery(focusEvent, function *() {
		rootWindow.flashFrame(false);
	});

	yield takeEvery(closeEvent, function *() {
		if (rootWindow.isFullScreen()) {
			yield call(() => new Promise((resolve) => rootWindow.once('leave-full-screen', resolve)));
			rootWindow.setFullScreen(false);
		}

		rootWindow.blur();

		const isTrayIconEnabled = yield select(({ isTrayIconEnabled }) => isTrayIconEnabled);

		if (process.platform === 'darwin' || isTrayIconEnabled) {
			rootWindow.hide();
			return;
		}

		if (process.platform === 'win32') {
			rootWindow.minimize();
			return;
		}

		rootWindow.destroy();
	});

	yield takeEvery(devtoolsFocusedEvent, function *() {
		yield put({ type: MAIN_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
	});

	yield takeEvery(appActivateEvent, function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	yield takeEvery(appBeforeQuitEvent, function *() {
		rootWindow.destroy();
	});

	yield takeEvery(appSecondInstanceEvent, function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});
}
