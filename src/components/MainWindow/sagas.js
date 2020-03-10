import { remote } from 'electron';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import { readFromStorage } from '../../localStorage';
import { readConfigurationFile, keepStoreValuePersisted, createEventChannelFromEmitter } from '../../sagaUtils';
import {
	DEEP_LINK_TRIGGERED,
	MAIN_WINDOW_STATE_CHANGED,
	MAIN_WINDOW_WEBCONTENTS_FOCUSED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_DISABLE_GPU,
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

const isInsideSomeScreen = ({ x, y, width, height }) =>
	remote.screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
			&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const loadUserMainWindowState = async () => {
	const userMainWindowState = await readConfigurationFile('main-window-state.json',
		{ appData: false, purgeAfter: true });

	if (!userMainWindowState) {
		return null;
	}

	const {
		x,
		y,
		width,
		height,
		isMaximized,
		isMinimized,
		isHidden,
	} = userMainWindowState;

	return {
		focused: true,
		visible: !isHidden,
		maximized: isMaximized,
		minimized: isMinimized,
		fullscreen: false,
		normal: !isMinimized && !isMaximized,
		bounds: { x, y, width, height },
	};
};

function *loadMainWindowState() {
	const userMainWindowState = yield call(loadUserMainWindowState);
	if (userMainWindowState) {
		return userMainWindowState;
	}

	const initialMainWindowState = yield select(({ mainWindowState }) => mainWindowState);

	return readFromStorage('mainWindowState', initialMainWindowState);
}

function *applyMainWindowState(browserWindow, mainWindowState) {
	let { x, y } = mainWindowState.bounds;
	const { width, height } = mainWindowState.bounds;
	if (!isInsideSomeScreen({ x, y, width, height })) {
		const {
			bounds: {
				width: primaryDisplayWidth,
				height: primaryDisplayHeight,
			},
		} = remote.screen.getPrimaryDisplay();
		x = (primaryDisplayWidth - width) / 2;
		y = (primaryDisplayHeight - height) / 2;
	}

	if (browserWindow.isVisible()) {
		return;
	}

	browserWindow.setBounds({ x, y, width, height });

	if (mainWindowState.maximized) {
		browserWindow.maximize();
	}

	if (mainWindowState.minimized) {
		browserWindow.minimize();
	}

	if (mainWindowState.fullscreen) {
		browserWindow.setFullScreen(true);
	}

	if (mainWindowState.visible) {
		browserWindow.showInactive();
	}

	if (mainWindowState.focused) {
		browserWindow.focus();
	}

	if (process.env.NODE_ENV === 'development') {
		browserWindow.webContents.openDevTools();
	}
}

function *takeAppEvents(browserWindow) {
	const activateEvent = createEventChannelFromEmitter(remote.app, 'activate');
	const beforeQuitEvent = createEventChannelFromEmitter(remote.app, 'before-quit');
	const secondInstanceEvent = createEventChannelFromEmitter(remote.app, 'second-instance');

	yield takeEvery(activateEvent, function *() {
		browserWindow.showInactive();
		browserWindow.focus();
	});

	yield takeEvery(beforeQuitEvent, function *() {
		browserWindow.destroy();
	});

	yield takeEvery(secondInstanceEvent, function *() {
		browserWindow.showInactive();
		browserWindow.focus();
	});
}

function *fetchAndDispatchWindowState(browserWindow) {
	const focused = browserWindow.isFocused();
	const visible = browserWindow.isVisible();
	const maximized = browserWindow.isMaximized();
	const minimized = browserWindow.isMinimized();
	const fullscreen = browserWindow.isFullScreen();
	const normal = browserWindow.isNormal();
	const bounds = browserWindow.getNormalBounds();

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

function *takeBrowserWindowEvents(browserWindow) {
	const showEvent = createEventChannelFromEmitter(browserWindow, 'show');
	const hideEvent = createEventChannelFromEmitter(browserWindow, 'hide');
	const focusEvent = createEventChannelFromEmitter(browserWindow, 'focus');
	const blurEvent = createEventChannelFromEmitter(browserWindow, 'blur');
	const maximizeEvent = createEventChannelFromEmitter(browserWindow, 'maximize');
	const unmaximizeEvent = createEventChannelFromEmitter(browserWindow, 'unmaximize');
	const minimizeEvent = createEventChannelFromEmitter(browserWindow, 'minimize');
	const restoreEvent = createEventChannelFromEmitter(browserWindow, 'restore');
	const resizeEvent = createEventChannelFromEmitter(browserWindow, 'resize');
	const moveEvent = createEventChannelFromEmitter(browserWindow, 'move');
	const closeEvent = createEventChannelFromEmitter(browserWindow, 'close');
	const devtoolsFocusedEvent = createEventChannelFromEmitter(browserWindow, 'devtools-focused');

	yield takeEvery(showEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(hideEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(focusEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(blurEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(maximizeEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(unmaximizeEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(minimizeEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(restoreEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(resizeEvent, fetchAndDispatchWindowState, browserWindow);
	yield takeEvery(moveEvent, fetchAndDispatchWindowState, browserWindow);

	yield takeEvery(focusEvent, function *() {
		browserWindow.flashFrame(false);
	});

	yield takeEvery(closeEvent, function *() {
		if (browserWindow.isFullScreen()) {
			yield call(() => new Promise((resolve) => browserWindow.once('leave-full-screen', resolve)));
			browserWindow.setFullScreen(false);
		}

		browserWindow.blur();

		const isTrayIconEnabled = yield select(({ isTrayIconEnabled }) => isTrayIconEnabled);

		if (process.platform === 'darwin' || isTrayIconEnabled) {
			browserWindow.hide();
			return;
		}

		if (process.platform === 'win32') {
			browserWindow.minimize();
			return;
		}

		browserWindow.destroy();
	});

	yield takeEvery(devtoolsFocusedEvent, function *() {
		yield put({ type: MAIN_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
	});
}

function *takeActions(browserWindow) {
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
		browserWindow.show();
	});

	yield takeEvery(MENU_BAR_RESET_ZOOM_CLICKED, function *() {
		browserWindow.show();
		browserWindow.webContents.zoomLevel = 0;
	});

	yield takeEvery(MENU_BAR_ZOOM_IN_CLICKED, function *() {
		browserWindow.show();
		if (browserWindow.webContents.zoomLevel >= 9) {
			return;
		}
		browserWindow.webContents.zoomLevel++;
	});

	yield takeEvery(MENU_BAR_ZOOM_OUT_CLICKED, function *() {
		browserWindow.show();
		if (browserWindow.webContents.zoomLevel <= -9) {
			return;
		}
		browserWindow.webContents.zoomLevel--;
	});

	yield takeEvery(MENU_BAR_RELOAD_APP_CLICKED, function *() {
		browserWindow.show();
		browserWindow.reload();
	});

	yield takeEvery(MENU_BAR_TOGGLE_DEVTOOLS_CLICKED, function *() {
		browserWindow.show();
		browserWindow.toggleDevTools();
	});

	yield takeEvery(MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED, function *({ payload: enabled }) {
		browserWindow.show();
		browserWindow.setFullScreen(enabled);
	});

	yield takeEvery(TRAY_ICON_TOGGLE_CLICKED, function *({ payload: visible }) {
		if (visible) {
			browserWindow.show();
		} else {
			browserWindow.hide();
		}
	});

	yield takeEvery(WEBVIEW_UNREAD_CHANGED, function *({ payload: badge }) {
		const isShowWindowOnUnreadChangedEnabled = yield select(({ isShowWindowOnUnreadChangedEnabled }) =>
			isShowWindowOnUnreadChangedEnabled);
		if (!isShowWindowOnUnreadChangedEnabled || browserWindow.isFocused() || typeof badge !== 'number') {
			return;
		}

		browserWindow.showInactive();
		browserWindow.flashFrame(true);
	});

	yield takeEvery([
		MENU_BAR_QUIT_CLICKED,
		TRAY_ICON_QUIT_CLICKED,
	], function *() {
		browserWindow.destroy();
	});

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		remote.app.relaunch({ args: remote.process.argv.slice(1).concat('--disable-gpu') });
		remote.app.exit();
	});
}

export function *mainWindowStateSaga(browserWindow) {
	const mainWindowState = yield *loadMainWindowState();
	yield *applyMainWindowState(browserWindow, mainWindowState);

	yield *keepStoreValuePersisted('mainWindowState');

	yield *takeAppEvents(browserWindow);
	yield *takeBrowserWindowEvents(browserWindow);
	yield *takeActions(browserWindow);

	yield *fetchAndDispatchWindowState(browserWindow);
}
