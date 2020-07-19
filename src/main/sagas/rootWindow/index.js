import path from 'path';

import { app, BrowserWindow } from 'electron';
import { takeEvery, select, put, call, getContext, spawn } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	DEEP_LINK_TRIGGERED,
	MAIN_WINDOW_STATE_CHANGED,
	MAIN_WINDOW_WEBCONTENTS_FOCUSED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
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
	TRAY_ICON_TOGGLE_CLICKED,
	WEBVIEW_FOCUS_REQUESTED,
} from '../../../actions';
import { eventEmitterChannel, storeValueChannel } from '../../channels';
import { getTrayIconPath, getAppIconPath } from '../../../icons';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
} from '../../selectors';

const createRootWindow = () => {
	const rootWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 400,
		minHeight: 400,
		titleBarStyle: 'hidden',
		backgroundColor: '#2f343d',
		show: false,
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
		},
	});

	rootWindow.addListener('close', (event) => {
		event.preventDefault();
	});

	rootWindow.webContents.addListener('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	rootWindow.loadFile(path.join(app.getAppPath(), 'app/public/app.html'));

	return rootWindow;
};

const fetchRootWindowState = (rootWindow) => ({
	focused: rootWindow.isFocused(),
	visible: rootWindow.isVisible(),
	maximized: rootWindow.isMaximized(),
	minimized: rootWindow.isMinimized(),
	fullscreen: rootWindow.isFullScreen(),
	normal: rootWindow.isNormal(),
	bounds: rootWindow.getNormalBounds(),
});

function *fetchAndDispatchWindowState(rootWindow) {
	yield put({
		type: MAIN_WINDOW_STATE_CHANGED,
		payload: fetchRootWindowState(rootWindow),
	});
}

function *watchRootWindow(rootWindow) {
	const store = yield getContext('store');

	const appActivateEvent = eventEmitterChannel(app, 'activate');
	const appBeforeQuitEvent = eventEmitterChannel(app, 'before-quit');
	const appSecondInstanceEvent = eventEmitterChannel(app, 'second-instance');

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

	const showEvent = eventEmitterChannel(rootWindow, 'show');
	const hideEvent = eventEmitterChannel(rootWindow, 'hide');
	const focusEvent = eventEmitterChannel(rootWindow, 'focus');
	const blurEvent = eventEmitterChannel(rootWindow, 'blur');
	const maximizeEvent = eventEmitterChannel(rootWindow, 'maximize');
	const unmaximizeEvent = eventEmitterChannel(rootWindow, 'unmaximize');
	const minimizeEvent = eventEmitterChannel(rootWindow, 'minimize');
	const restoreEvent = eventEmitterChannel(rootWindow, 'restore');
	const resizeEvent = eventEmitterChannel(rootWindow, 'resize');
	const moveEvent = eventEmitterChannel(rootWindow, 'move');
	const closeEvent = eventEmitterChannel(rootWindow, 'close');
	const devtoolsFocusedEvent = eventEmitterChannel(rootWindow, 'devtools-focused');

	yield takeEvery(showEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(hideEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(blurEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(maximizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(unmaximizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(minimizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(restoreEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(resizeEvent, fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(moveEvent, fetchAndDispatchWindowState, rootWindow);

	yield takeEvery(focusEvent, function *() {
		yield call(fetchAndDispatchWindowState, rootWindow);
		rootWindow.flashFrame(false);
	});

	yield call(fetchAndDispatchWindowState, rootWindow);

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

	if (process.platform === 'linux' || process.platform === 'win32') {
		const isMenuBarEnabledChannel = storeValueChannel(store, selectIsMenuBarEnabled);

		yield takeEvery(isMenuBarEnabledChannel, function *(isMenuBarEnabled) {
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});

		const selectRootWindowIcon = createSelector([
			selectIsTrayIconEnabled,
			selectGlobalBadge,
		], (isTrayIconEnabled, badge) =>
			(isTrayIconEnabled ? getTrayIconPath({ badge }) : getAppIconPath()));

		const rootWindowIconChannel = storeValueChannel(store, selectRootWindowIcon);

		yield takeEvery(rootWindowIconChannel, function *(icon) {
			rootWindow.setIcon(icon);
		});
	}

	const globalBadgeCountChannel = storeValueChannel(store, selectGlobalBadgeCount);

	yield takeEvery(globalBadgeCountChannel, function *(globalBadgeCount) {
		if (rootWindow.isFocused() || globalBadgeCount === 0) {
			return;
		}

		const isShowWindowOnUnreadChangedEnabled = yield select(selectIsShowWindowOnUnreadChangedEnabled);

		if (isShowWindowOnUnreadChangedEnabled) {
			rootWindow.showInactive();
			return;
		}

		if (process.platform === 'win32') {
			rootWindow.flashFrame(true);
		}
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
			return;
		}

		rootWindow.hide();
	});
}

export function *rootWindowSaga() {
	const rootWindow = createRootWindow();

	yield spawn(watchRootWindow, rootWindow);

	return rootWindow;
}
