import path from 'path';

import { app, BrowserWindow, Menu, dialog, ipcMain, shell, clipboard, screen } from 'electron';
import { t } from 'i18next';
import { takeEvery, select, put, call, getContext, spawn, take } from 'redux-saga/effects';
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
	SIDE_BAR_CONTEXT_MENU_POPPED_UP,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TRAY_ICON_TOGGLE_CLICKED,
	UPDATES_UPDATE_DOWNLOADED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_CONTEXT_MENU_POPPED_UP,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
} from '../../actions';
import { eventEmitterChannel, storeChangeChannel } from '../channels';
import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectSpellCheckingDictionaries,
	selectInstalledSpellCheckingDictionariesDirectoryPath,
	selectFocusedWebContents,
	selectMainWindowState,
} from '../selectors';
import { getCorrectionsForMisspelling, getMisspelledWords } from './spellChecking';
import { readFromStorage } from '../localStorage';
import { readConfigurationFile } from '../fileSystemStorage';

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

const isInsideSomeScreen = ({ x, y, width, height }) =>
	screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
			&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const loadWindowStateFromFileSystemStorage = async () => {
	const userMainWindowState = await readConfigurationFile('main-window-state.json', { appData: false, purgeAfter: true });

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

function *loadMainWindowState(rootWindow) {
	const userMainWindowState = yield call(loadWindowStateFromFileSystemStorage);
	if (userMainWindowState) {
		return userMainWindowState;
	}

	const initialMainWindowState = yield select(selectMainWindowState);

	return yield call(readFromStorage, rootWindow, 'mainWindowState', initialMainWindowState);
}

function *applyMainWindowState(rootWindow, mainWindowState) {
	let { x, y } = mainWindowState.bounds;
	const { width, height } = mainWindowState.bounds;
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

	if (mainWindowState.maximized) {
		rootWindow.maximize();
	}

	if (mainWindowState.minimized) {
		rootWindow.minimize();
	}

	if (mainWindowState.fullscreen) {
		rootWindow.setFullScreen(true);
	}

	if (mainWindowState.visible) {
		rootWindow.showInactive();
	}

	if (mainWindowState.focused) {
		rootWindow.focus();
	}

	if (process.env.NODE_ENV === 'development') {
		rootWindow.webContents.openDevTools();
	}
}

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
		if (rootWindow.isDestroyed()) {
			return;
		}
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

	yield takeEvery(UPDATES_UPDATE_DOWNLOADED, function *() {
		const { response } = yield call(dialog.showMessageBox, rootWindow, {
			type: 'question',
			title: t('dialog.updateReady.title'),
			message: t('dialog.updateReady.message'),
			buttons: [
				t('dialog.updateReady.installLater'),
				t('dialog.updateReady.installNow'),
			],
			defaultId: 1,
		});

		if (response === 0) {
			yield call(dialog.showMessageBox, rootWindow, {
				type: 'info',
				title: t('dialog.updateInstallLater.title'),
				message: t('dialog.updateInstallLater.message'),
				buttons: [t('dialog.updateInstallLater.ok')],
				defaultId: 0,
			});
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

		const { response } = yield call(dialog.showMessageBox, rootWindow, {
			title: t('dialog.certificateError.title'),
			message: t('dialog.certificateError.message', { issuerName }),
			detail,
			type: 'warning',
			buttons: [
				t('dialog.certificateError.yes'),
				t('dialog.certificateError.no'),
			],
			cancelId: 1,
		});

		if (response === 0) {
			yield put({ type: WEBVIEW_CERTIFICATE_TRUSTED, payload: { webContentsId, fingerprint } });
			return;
		}

		yield put({ type: WEBVIEW_CERTIFICATE_DENIED, payload: { webContentsId, fingerprint } });
	});

	yield takeEvery(WEBVIEW_CONTEXT_MENU_POPPED_UP, function *({ payload: params }) {
		const dictionaries = yield select(selectSpellCheckingDictionaries);
		const dictionariesDirectoryPath = yield select(selectInstalledSpellCheckingDictionariesDirectoryPath);

		const webContents = yield select(selectFocusedWebContents);

		const createSpellCheckingMenuTemplate = ({
			isEditable,
			corrections,
			dictionaries,
		}) => {
			if (!isEditable) {
				return [];
			}

			const handleBrowserForLanguage = async () => {
				const { filePaths } = await dialog.showOpenDialog(rootWindow, {
					title: t('dialog.loadDictionary.title'),
					defaultPath: dictionariesDirectoryPath,
					filters: [
						{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['dic', 'aff'] },
						{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
					],
					properties: ['openFile', 'multiSelections'],
				});

				store.dispatch({ type: WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN, payload: filePaths });
			};

			return [
				...corrections ? [
					...corrections.length === 0
						? [
							{
								label: t('contextMenu.noSpellingSuggestions'),
								enabled: false,
							},
						]
						: corrections.slice(0, 6).map((correction) => ({
							label: correction,
							click: () => webContents.replaceMisspelling(correction),
						})),
					...corrections.length > 6 ? [
						{
							label: t('contextMenu.moreSpellingSuggestions'),
							submenu: corrections.slice(6).map((correction) => ({
								label: correction,
								click: () => webContents.replaceMisspelling(correction),
							})),
						},
					] : [],
					{ type: 'separator' },
				] : [],
				{
					label: t('contextMenu.spellingLanguages'),
					enabled: dictionaries.length > 0,
					submenu: [
						...dictionaries.map(({ name, enabled }) => ({
							label: name,
							type: 'checkbox',
							checked: enabled,
							click: ({ checked }) => store.dispatch({
								type: WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
								payload: { name, enabled: checked },
							}),
						})),
						{ type: 'separator' },
						{
							label: t('contextMenu.browseForLanguage'),
							click: handleBrowserForLanguage,
						},
					],
				},
				{ type: 'separator' },
			];
		};

		const createImageMenuTemplate = ({
			mediaType,
			srcURL,
		}) => (
			mediaType === 'image' ? [
				{
					label: t('contextMenu.saveImageAs'),
					click: () => webContents.downloadURL(srcURL),
				},
				{ type: 'separator' },
			] : []
		);

		const createLinkMenuTemplate = ({
			linkURL,
			linkText,
		}) => (
			linkURL
				? [
					{
						label: t('contextMenu.openLink'),
						click: () => shell.openExternal(linkURL),
					},
					{
						label: t('contextMenu.copyLinkText'),
						click: () => clipboard.write({ text: linkText, bookmark: linkText }),
						enabled: !!linkText,
					},
					{
						label: t('contextMenu.copyLinkAddress'),
						click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
					},
					{ type: 'separator' },
				]
				: []
		);

		const createDefaultMenuTemplate = ({
			editFlags: {
				canUndo = false,
				canRedo = false,
				canCut = false,
				canCopy = false,
				canPaste = false,
				canSelectAll = false,
			} = {},
		} = {}) => [
			{
				label: t('contextMenu.undo'),
				role: 'undo',
				accelerator: 'CommandOrControl+Z',
				enabled: canUndo,
			},
			{
				label: t('contextMenu.redo'),
				role: 'redo',
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				enabled: canRedo,
			},
			{ type: 'separator' },
			{
				label: t('contextMenu.cut'),
				role: 'cut',
				accelerator: 'CommandOrControl+X',
				enabled: canCut,
			},
			{
				label: t('contextMenu.copy'),
				role: 'copy',
				accelerator: 'CommandOrControl+C',
				enabled: canCopy,
			},
			{
				label: t('contextMenu.paste'),
				role: 'paste',
				accelerator: 'CommandOrControl+V',
				enabled: canPaste,
			},
			{
				label: t('contextMenu.selectAll'),
				role: 'selectall',
				accelerator: 'CommandOrControl+A',
				enabled: canSelectAll,
			},
		];

		const props = {
			...params,
			corrections: yield call(getCorrectionsForMisspelling, params.selectionText),
			dictionaries,
		};

		const template = [
			...createSpellCheckingMenuTemplate(props),
			...createImageMenuTemplate(props),
			...createLinkMenuTemplate(props),
			...createDefaultMenuTemplate(props),
		];

		const menu = Menu.buildFromTemplate(template);
		menu.popup({ window: rootWindow });
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
}

export function *rootWindowSaga() {
	const rootWindow = createRootWindow();
	yield take(eventEmitterChannel(rootWindow, 'ready-to-show'));

	const store = yield getContext('store');

	yield spawn(watchRootWindow, rootWindow, store);

	const mainWindowState = yield *loadMainWindowState(rootWindow);
	yield *applyMainWindowState(rootWindow, mainWindowState);

	return rootWindow;
}
