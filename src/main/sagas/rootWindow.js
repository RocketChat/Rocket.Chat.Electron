import path from 'path';

import { app, BrowserWindow, Menu } from 'electron';
import { t } from 'i18next';
import { takeEvery, select, put, call, getContext, spawn } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	DEEP_LINK_TRIGGERED,
	ROOT_WINDOW_STATE_CHANGED,
	ROOT_WINDOW_WEBCONTENTS_FOCUSED,
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
	SIDE_BAR_CONTEXT_MENU_POPPED_UP,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
} from '../../actions';
import { eventEmitterChannel, storeChangeChannel } from '../channels';
import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
} from '../selectors';

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
		type: ROOT_WINDOW_STATE_CHANGED,
		payload: fetchRootWindowState(rootWindow),
	});
}

function *watchRootWindow(rootWindow, store) {
	yield takeEvery(eventEmitterChannel(app, 'activate'), function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	yield takeEvery(eventEmitterChannel(app, 'before-quit'), function *() {
		rootWindow.destroy();
	});

	yield takeEvery(eventEmitterChannel(app, 'second-instance'), function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	yield takeEvery(eventEmitterChannel(rootWindow, 'show'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'hide'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'focus'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'blur'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'maximize'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'unmaximize'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'minimize'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'restore'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'resize'), fetchAndDispatchWindowState, rootWindow);
	yield takeEvery(eventEmitterChannel(rootWindow, 'move'), fetchAndDispatchWindowState, rootWindow);

	yield takeEvery(eventEmitterChannel(rootWindow, 'focus'), function *() {
		rootWindow.flashFrame(false);
	});

	yield call(fetchAndDispatchWindowState, rootWindow);

	yield takeEvery(eventEmitterChannel(rootWindow, 'close'), function *() {
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

	yield takeEvery(eventEmitterChannel(rootWindow, 'devtools-focused'), function *() {
		yield put({ type: ROOT_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
	});

	if (process.platform === 'linux' || process.platform === 'win32') {
		yield takeEvery(storeChangeChannel(store, selectIsMenuBarEnabled), function *([isMenuBarEnabled]) {
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});

		const selectRootWindowIcon = createSelector([
			selectIsTrayIconEnabled,
			selectGlobalBadge,
		], (isTrayIconEnabled, badge) =>
			(isTrayIconEnabled ? getTrayIconPath({ badge }) : getAppIconPath()));

		yield takeEvery(storeChangeChannel(store, selectRootWindowIcon), function *([icon]) {
			rootWindow.setIcon(icon);
		});
	}

	yield takeEvery(storeChangeChannel(store, selectGlobalBadgeCount), function *([globalBadgeCount]) {
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

	yield takeEvery(SIDE_BAR_CONTEXT_MENU_POPPED_UP, function *({ payload: url }) {
		const menuTemplate = [
			{
				label: t('sidebar.item.reload'),
				click: () => store.dispatch({ type: SIDE_BAR_RELOAD_SERVER_CLICKED, payload: url }),
			},
			{
				label: t('sidebar.item.remove'),
				click: () => store.dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: url }),
			},
			{ type: 'separator' },
			{
				label: t('sidebar.item.openDevTools'),
				click: () => store.dispatch({ type: SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url }),
			},
		];
		const menu = Menu.buildFromTemplate(menuTemplate);
		menu.popup(rootWindow);
	});
}

export function *rootWindowSaga() {
	const rootWindow = createRootWindow();

	const store = yield getContext('store');

	yield spawn(watchRootWindow, rootWindow, store);

	return rootWindow;
}
