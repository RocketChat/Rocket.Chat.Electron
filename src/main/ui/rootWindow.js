import fs from 'fs';
import path from 'path';

import {
	app,
	BrowserWindow,
	ipcMain,
	screen,
} from 'electron';
import { t } from 'i18next';
import {
	call,
	fork,
	put,
	select,
	setContext,
	takeEvery,
} from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	CERTIFICATE_TRUST_REQUESTED,
	DEEP_LINK_TRIGGERED,
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
	ROOT_WINDOW_INSTALL_UPDATE_CLICKED,
	ROOT_WINDOW_STATE_CHANGED,
	ROOT_WINDOW_WEBCONTENTS_FOCUSED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TRAY_ICON_TOGGLE_CLICKED,
	UPDATES_UPDATE_DOWNLOADED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_FOCUS_REQUESTED,
	PERSISTABLE_VALUES_MERGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FAVICON_CHANGED,
} from '../../actions';
import { eventEmitterChannel } from '../channels';
import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectSpellCheckingDictionaries,
	selectPersistableValues,
	selectMainWindowState,
} from '../selectors';
import { getMisspelledWords } from '../spellChecking';
import { getPlatform } from '../app';
import { watchValue } from '../sagas/utils';
import { watchSideBarContextMenuEvents } from './contextMenus/sidebar';
import { watchWebviewContextMenuEvents } from './contextMenus/webview';
import {
	askUpdateInstall,
	AskUpdateInstallResponse,
	warnAboutInstallUpdateLater,
	askForCertificateTrust,
	AskForCertificateTrustResponse,
} from './dialogs';

const createRootWindow = async () => {
	await app.whenReady();

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

	return new Promise((resolve) => {
		rootWindow.on('ready-to-show', () => {
			resolve(rootWindow);
		});
	});
};

const isInsideSomeScreen = ({ x, y, width, height }) =>
	screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
			&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const applyMainWindowState = (rootWindow, rootWindowState) => {
	let { x, y } = rootWindowState.bounds;
	const { width, height } = rootWindowState.bounds;
	if (!isInsideSomeScreen({ x, y, width, height })) {
		const {
			bounds: {
				width: primaryDisplayWidth,
				height: primaryDisplayHeight,
			},
		} = screen.getPrimaryDisplay();
		x = (primaryDisplayWidth - width) / 2;
		y = (primaryDisplayHeight - height) / 2;
	}

	if (rootWindow.isVisible()) {
		return;
	}

	rootWindow.setBounds({ x, y, width, height });

	if (rootWindowState.maximized) {
		rootWindow.maximize();
	}

	if (rootWindowState.minimized) {
		rootWindow.minimize();
	}

	if (rootWindowState.fullscreen) {
		rootWindow.setFullScreen(true);
	}

	if (rootWindowState.visible) {
		rootWindow.show();
	}

	if (rootWindowState.focused) {
		rootWindow.focus();
	}

	if (process.env.NODE_ENV === 'development') {
		rootWindow.webContents.openDevTools();
	}
};

const getLocalStorage = (rootWindow) => rootWindow.webContents.executeJavaScript('({...localStorage})');

const purgeLocalStorage = (rootWindow) => rootWindow.webContents.executeJavaScript('localStorage.clear()');

const fetchRootWindowState = (rootWindow) => ({
	focused: rootWindow.isFocused(),
	visible: rootWindow.isVisible(),
	maximized: rootWindow.isMaximized(),
	minimized: rootWindow.isMinimized(),
	fullscreen: rootWindow.isFullScreen(),
	normal: rootWindow.isNormal(),
	bounds: rootWindow.getNormalBounds(),
});

function *watchUpdates(rootWindow) {
	const platform = yield call(getPlatform);

	if (platform === 'linux' || platform === 'win32') {
		yield watchValue(selectIsMenuBarEnabled, function *([isMenuBarEnabled]) {
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});

		const selectRootWindowIcon = createSelector([
			selectIsTrayIconEnabled,
			selectGlobalBadge,
		], (isTrayIconEnabled, globalBadge) => [isTrayIconEnabled, globalBadge]);

		yield watchValue(selectRootWindowIcon, function *([[isTrayIconEnabled, globalBadge]]) {
			const icon = isTrayIconEnabled ? getTrayIconPath({ badge: globalBadge }) : getAppIconPath();
			rootWindow.setIcon(icon);
		});
	}

	yield watchValue(selectGlobalBadgeCount, function *([globalBadgeCount]) {
		if (rootWindow.isFocused() || globalBadgeCount === 0) {
			return;
		}

		const isShowWindowOnUnreadChangedEnabled = yield select(selectIsShowWindowOnUnreadChangedEnabled);

		if (isShowWindowOnUnreadChangedEnabled) {
			rootWindow.showInactive();
			return;
		}

		if (platform === 'win32') {
			rootWindow.flashFrame(true);
		}
	});
}

function *watchEvents(rootWindow) {
	yield takeEvery(eventEmitterChannel(app, 'activate'), function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	yield takeEvery(eventEmitterChannel(app, 'before-quit'), function *() {
		if (rootWindow.isDestroyed()) {
			return;
		}
		rootWindow.destroy();
	});

	yield takeEvery(eventEmitterChannel(app, 'second-instance'), function *() {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	function *fetchAndDispatchWindowState(rootWindow) {
		yield put({
			type: ROOT_WINDOW_STATE_CHANGED,
			payload: fetchRootWindowState(rootWindow),
		});
	}

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

		const isTrayIconEnabled = yield select(selectIsTrayIconEnabled);

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

	yield takeEvery(eventEmitterChannel(ipcMain, 'get-misspelled-words'), function *([event, words]) {
		const misspelledWords = yield call(getMisspelledWords, words);
		const id = JSON.stringify(words);
		event.sender.send('misspelled-words', id, misspelledWords);
	});

	yield takeEvery(eventEmitterChannel(ipcMain, 'get-spell-checking-language'), function *([event]) {
		const selectDictionaryName = createSelector(selectSpellCheckingDictionaries, (spellCheckingDictionaries) =>
			spellCheckingDictionaries.filter(({ enabled }) => enabled).map(({ name }) => name)[0]);
		const dictionaryName = yield select(selectDictionaryName);
		const language = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
		event.sender.send('set-spell-checking-language', language);
	});

	yield takeEvery(eventEmitterChannel(ipcMain, 'title-changed'), function *([, { url, title }]) {
		yield put({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title } });
	});

	yield takeEvery(eventEmitterChannel(ipcMain, 'favicon-changed'), function *([, { url, favicon }]) {
		yield put({ type: WEBVIEW_FAVICON_CHANGED, payload: { url, favicon } });
	});

	yield call(() => {
		ipcMain.handle('get-webcontents-id', (event) => event.sender.id);
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

	yield takeEvery(UPDATES_UPDATE_DOWNLOADED, function *() {
		const response = yield call(askUpdateInstall, rootWindow);

		if (response === AskUpdateInstallResponse.INSTALL_LATER) {
			yield call(warnAboutInstallUpdateLater, rootWindow);
			return;
		}

		yield put({ type: ROOT_WINDOW_INSTALL_UPDATE_CLICKED });
	});

	yield takeEvery(CERTIFICATE_TRUST_REQUESTED, function *({ payload }) {
		const { webContentsId, requestedUrl, error, fingerprint, issuerName, willBeReplaced } = payload;

		if (webContentsId !== rootWindow.webContents.id) {
			return;
		}

		let detail = `URL: ${ requestedUrl }\nError: ${ error }`;
		if (willBeReplaced) {
			detail = t('error.differentCertificate', { detail });
		}

		const response = yield call(askForCertificateTrust, rootWindow, issuerName, detail);
		if (response === AskForCertificateTrustResponse.YES) {
			yield put({ type: WEBVIEW_CERTIFICATE_TRUSTED, payload: { webContentsId, fingerprint } });
			return;
		}

		yield put({ type: WEBVIEW_CERTIFICATE_DENIED, payload: { webContentsId, fingerprint } });
	});

	yield *watchSideBarContextMenuEvents(rootWindow);
	yield *watchWebviewContextMenuEvents(rootWindow);
}

function *mergePersistableValues(localStorage) {
	const localStorageValues = Object.fromEntries(
		Object.entries(localStorage)
			.map(([key, value]) => {
				try {
					return [key, JSON.parse(value)];
				} catch (error) {
					return [];
				}
			}),
	);

	const currentValues = yield select(selectPersistableValues);

	let values = selectPersistableValues({
		...currentValues,
		...localStorageValues,
	});

	if (localStorage.autohideMenu) {
		values = {
			...values,
			isMenuBarEnabled: localStorage.autohideMenu !== 'true',
		};
	}

	if (localStorage.showWindowOnUnreadChanged) {
		values = {
			...values,
			isShowWindowOnUnreadChangedEnabled: localStorage.showWindowOnUnreadChanged === 'true',
		};
	}

	if (localStorage['sidebar-closed']) {
		values = {
			...values,
			isSideBarEnabled: localStorage['sidebar-closed'] !== 'true',
		};
	}

	if (localStorage.hideTray) {
		values = {
			...values,
			isTrayIconEnabled: localStorage.hideTray !== 'true',
		};
	}

	const userMainWindowState = yield call(async () => {
		try {
			const filePath = path.join(app.getPath('userData'), 'main-window-state.json');
			const content = await fs.promises.readFile(filePath, 'utf8');
			const json = JSON.parse(content);
			await fs.promises.unlink(filePath);

			return json && typeof json === 'object' ? json : {};
		} catch (error) {
			return {};
		}
	});

	values = {
		...values,
		mainWindowState: {
			focused: true,
			visible: !(userMainWindowState?.isHidden ?? !values?.mainWindowState?.visible),
			maximized: userMainWindowState.isMaximized ?? values?.mainWindowState?.maximized,
			minimized: userMainWindowState.isMinimized ?? values?.mainWindowState?.minimized,
			fullscreen: false,
			normal: !(userMainWindowState.isMinimized || userMainWindowState.isMaximized) ?? values?.mainWindowState?.normal,
			bounds: {
				x: userMainWindowState.x ?? values?.mainWindowState?.bounds?.x,
				y: userMainWindowState.y ?? values?.mainWindowState?.bounds?.y,
				width: userMainWindowState.width ?? values?.mainWindowState?.bounds?.width,
				height: userMainWindowState.height ?? values?.mainWindowState?.bounds?.height,
			},
		},
	};

	yield put({ type: PERSISTABLE_VALUES_MERGED, payload: values });
}

export function *setupRootWindow(consumeLocalStorage) {
	const rootWindow = yield call(createRootWindow);
	yield setContext({ rootWindow });

	const localStorage = yield call(getLocalStorage, rootWindow);

	yield *mergePersistableValues(localStorage);
	yield *consumeLocalStorage(localStorage);

	yield call(purgeLocalStorage, rootWindow);

	const rootWindowState = yield select(selectMainWindowState);
	yield call(applyMainWindowState, rootWindow, rootWindowState);

	yield fork(watchUpdates, rootWindow);
	yield fork(watchEvents, rootWindow);
}
