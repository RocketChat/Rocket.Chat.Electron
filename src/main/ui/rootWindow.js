import path from 'path';

import {
	app,
	BrowserWindow,
	screen,
	shell,
	ipcMain,
	webContents,
	clipboard,
	Menu,
} from 'electron';
import { t } from 'i18next';
import { createSelector } from 'reselect';

import {
	ROOT_WINDOW_STATE_CHANGED,
	ROOT_WINDOW_WEBCONTENTS_FOCUSED,
	WEBVIEW_DID_NAVIGATE,
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
	WEBVIEW_MESSAGE_BOX_BLURRED,
	WEBVIEW_DID_START_LOADING,
	WEBVIEW_DID_FAIL_LOAD,
	WEBVIEW_DOM_READY,
} from '../../actions';
import { EVENT_WEB_CONTENTS_FOCUS_CHANGED, EVENT_BROWSER_VIEW_ATTACHED } from '../../ipc';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectSpellCheckingDictionaries,
	selectFocusedWebContents,
} from '../../selectors';
import { getTrayIconPath, getAppIconPath } from '../icons';
import { importSpellCheckingDictionaries, getCorrectionsForMisspelling } from '../spellChecking';
import { browseForSpellCheckingDictionary } from './dialogs';

const webContentsByServerUrl = new Map();

export const getWebContentsByServerUrl = (serverUrl) =>
	webContentsByServerUrl.get(serverUrl);

export const getAllServerWebContents = () =>
	Array.from(webContentsByServerUrl.values());

const initializeServerWebContents = (serverUrl, guestWebContents, reduxStore, rootWindow) => {
	webContentsByServerUrl.set(serverUrl, guestWebContents);

	guestWebContents.addListener('destroyed', () => {
		webContentsByServerUrl.delete(serverUrl);
	});

	const handleDidStartLoading = (event, ...args) => {
		reduxStore.dispatch({ type: WEBVIEW_MESSAGE_BOX_BLURRED });
		rootWindow.webContents.send(WEBVIEW_DID_START_LOADING, serverUrl, ...args);
	};

	const handleDidFailLoad = (event, ...args) => {
		rootWindow.webContents.send(WEBVIEW_DID_FAIL_LOAD, serverUrl, ...args);
	};

	const handleDomReady = (event, ...args) => {
		rootWindow.webContents.send(WEBVIEW_DOM_READY, serverUrl, ...args);
	};

	const handleDidNavigateInPage = (event, pageUrl) => {
		reduxStore.dispatch({
			type: WEBVIEW_DID_NAVIGATE,
			payload: {
				webContentsId: webContents.id,
				url: serverUrl,
				pageUrl,
			},
		});
	};

	const handleContextMenu = async (event, params) => {
		event.preventDefault();

		const dictionaries = selectSpellCheckingDictionaries(reduxStore.getState());
		const webContents = selectFocusedWebContents(reduxStore.getState());

		const createSpellCheckingMenuTemplate = ({
			isEditable,
			corrections,
			dictionaries,
		}) => {
			if (!isEditable) {
				return [];
			}

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
							click: () => {
								webContents.replaceMisspelling(correction);
							},
						})),
					...corrections.length > 6 ? [
						{
							label: t('contextMenu.moreSpellingSuggestions'),
							submenu: corrections.slice(6).map((correction) => ({
								label: correction,
								click: () => {
									webContents.replaceMisspelling(correction);
								},
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
							click: ({ checked }) => {
								reduxStore.dispatch({
									type: WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
									payload: { name, enabled: checked },
								});
							},
						})),
						{ type: 'separator' },
						{
							label: t('contextMenu.browseForLanguage'),
							click: async () => {
								const filePaths = await browseForSpellCheckingDictionary(rootWindow);
								importSpellCheckingDictionaries(reduxStore, filePaths);
							},
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
			corrections: await getCorrectionsForMisspelling(params.selectionText),
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
	};

	const handleBeforeInputEvent = (event, { type, key }) => {
		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

		if (key !== shortcutKey) {
			return;
		}

		rootWindow.webContents.sendInputEvent({ type, keyCode: key });
	};

	guestWebContents.addListener('did-start-loading', handleDidStartLoading);
	guestWebContents.addListener('did-fail-load', handleDidFailLoad);
	guestWebContents.addListener('dom-ready', handleDomReady);
	guestWebContents.addListener('did-navigate-in-page', handleDidNavigateInPage);
	guestWebContents.addListener('context-menu', handleContextMenu);
	guestWebContents.addListener('before-input-event', handleBeforeInputEvent);
};

const attachGuestWebContentsEvents = (reduxStore, rootWindow) => {
	const handleWillAttachWebview = (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
		webPreferences.preload = `${ app.getAppPath() }/app/preload.js`;
		webPreferences.nodeIntegration = false;
		webPreferences.nodeIntegrationInWorker = true;
		webPreferences.nodeIntegrationInSubFrames = true;
		webPreferences.enableRemoteModule = false;
		webPreferences.webSecurity = true;
	};

	const handleDidAttachWebview = (event, webContents) => {
		// webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
		// webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
		// webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

		webContents.addListener('new-window', (event, url, frameName, disposition, options) => {
			event.preventDefault();

			if (disposition === 'foreground-tab' || disposition === 'background-tab') {
				shell.openExternal(url);
				return;
			}

			const newWindow = new BrowserWindow({
				...options,
				show: false,
			});

			newWindow.once('ready-to-show', () => {
				newWindow.show();
			});

			if (!options.webContents) {
				newWindow.loadURL(url);
			}

			event.newGuest = newWindow;
		});
	};

	ipcMain.addListener(EVENT_BROWSER_VIEW_ATTACHED, (event, serverUrl, webContentsId) => {
		const guestWebContents = webContents.fromId(webContentsId);
		initializeServerWebContents(serverUrl, guestWebContents, reduxStore, rootWindow);
	});

	ipcMain.addListener(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (event, serverUrl) => {
		getWebContentsByServerUrl(serverUrl).loadURL(serverUrl);
	});

	rootWindow.webContents.addListener('will-attach-webview', handleWillAttachWebview);
	rootWindow.webContents.addListener('did-attach-webview', handleDidAttachWebview);
};

export const createRootWindow = async (reduxStore) => {
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
			nodeIntegrationInSubFrames: true,
		},
	});

	rootWindow.addListener('close', (event) => {
		event.preventDefault();
	});

	attachGuestWebContentsEvents(reduxStore, rootWindow);

	if (process.env.NODE_ENV === 'development') {
		rootWindow.webContents.openDevTools();
	}

	rootWindow.loadFile(path.join(app.getAppPath(), 'app/public/index.html'));

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

export const applyMainWindowState = (rootWindow, rootWindowState) => {
	let { x, y } = rootWindowState.bounds;
	const { width, height } = rootWindowState.bounds;
	if (!isInsideSomeScreen({ x, y, width, height })) {
		const {
			bounds: {
				width: primaryDisplayWidth,
				height: primaryDisplayHeight,
			},
		} = screen.getPrimaryDisplay();
		x = Math.round((primaryDisplayWidth - width) / 2);
		y = Math.round((primaryDisplayHeight - height) / 2);
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

export const setupRootWindow = (reduxStore, rootWindow) => {
	if (process.platform === 'linux' || process.platform === 'win32') {
		reduxStore.subscribe(() => {
			const isMenuBarEnabled = selectIsMenuBarEnabled(reduxStore.getState());
			rootWindow.autoHideMenuBar = !isMenuBarEnabled;
			rootWindow.setMenuBarVisibility(isMenuBarEnabled);
		});

		const selectRootWindowIcon = createSelector([
			selectIsTrayIconEnabled,
			selectGlobalBadge,
		], (isTrayIconEnabled, globalBadge) => [isTrayIconEnabled, globalBadge]);

		reduxStore.subscribe(() => {
			const [isTrayIconEnabled, globalBadge] = selectRootWindowIcon(reduxStore.getState());
			const icon = isTrayIconEnabled ? getTrayIconPath({ badge: globalBadge }) : getAppIconPath();
			rootWindow.setIcon(icon);
		});
	}

	reduxStore.subscribe(() => {
		const globalBadgeCount = selectGlobalBadgeCount(reduxStore.getState());

		if (rootWindow.isFocused() || globalBadgeCount === 0) {
			return;
		}

		const isShowWindowOnUnreadChangedEnabled = selectIsShowWindowOnUnreadChangedEnabled(reduxStore.getState());

		if (isShowWindowOnUnreadChangedEnabled) {
			rootWindow.showInactive();
			return;
		}

		if (process.platform === 'win32') {
			rootWindow.flashFrame(true);
		}
	});

	const fetchAndDispatchWindowState = () => {
		reduxStore.dispatch({
			type: ROOT_WINDOW_STATE_CHANGED,
			payload: fetchRootWindowState(rootWindow),
		});
	};

	rootWindow.addListener('show', fetchAndDispatchWindowState);
	rootWindow.addListener('hide', fetchAndDispatchWindowState);
	rootWindow.addListener('focus', fetchAndDispatchWindowState);
	rootWindow.addListener('blur', fetchAndDispatchWindowState);
	rootWindow.addListener('maximize', fetchAndDispatchWindowState);
	rootWindow.addListener('unmaximize', fetchAndDispatchWindowState);
	rootWindow.addListener('minimize', fetchAndDispatchWindowState);
	rootWindow.addListener('restore', fetchAndDispatchWindowState);
	rootWindow.addListener('resize', fetchAndDispatchWindowState);
	rootWindow.addListener('move', fetchAndDispatchWindowState);

	fetchAndDispatchWindowState();

	rootWindow.addListener('focus', () => {
		rootWindow.flashFrame(false);
	});

	rootWindow.addListener('close', async () => {
		if (rootWindow.isFullScreen()) {
			await new Promise((resolve) => rootWindow.once('leave-full-screen', resolve));
			rootWindow.setFullScreen(false);
		}

		rootWindow.blur();

		const isTrayIconEnabled = selectIsTrayIconEnabled(reduxStore.getState());

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

	rootWindow.addListener('devtools-focused', () => {
		reduxStore.dispatch({ type: ROOT_WINDOW_WEBCONTENTS_FOCUSED, payload: -1 });
	});

	ipcMain.addListener(EVENT_WEB_CONTENTS_FOCUS_CHANGED, (event, webContentsId = rootWindow.webContents.id) => {
		if (webContents.fromId(webContentsId).isDevToolsFocused()) {
			reduxStore.dispatch({
				type: ROOT_WINDOW_WEBCONTENTS_FOCUSED,
				payload: -1,
			});
		}

		reduxStore.dispatch({
			type: ROOT_WINDOW_WEBCONTENTS_FOCUSED,
			payload: webContentsId,
		});
	});
};
