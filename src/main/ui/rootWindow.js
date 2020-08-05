import path from 'path';

import {
	app,
	BrowserWindow,
	screen,
	shell,
	ipcMain,
	webContents,
} from 'electron';
import { createSelector } from 'reselect';

import {
	ROOT_WINDOW_STATE_CHANGED,
	ROOT_WINDOW_WEBCONTENTS_FOCUSED,
} from '../../actions';
import { getTrayIconPath, getAppIconPath } from '../icons';
import {
	selectGlobalBadge,
	selectGlobalBadgeCount,
	selectIsMenuBarEnabled,
	selectIsTrayIconEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
} from '../selectors';
import { EVENT_WEB_CONTENTS_FOCUS_CHANGED } from '../../ipc';

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

export const createRootWindow = async () => {
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
			nodeIntegrationInSubFrames: true,
		},
	});

	rootWindow.addListener('close', (event) => {
		event.preventDefault();
	});

	rootWindow.webContents.addListener('will-attach-webview', handleWillAttachWebview);
	rootWindow.webContents.addListener('did-attach-webview', handleDidAttachWebview);

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

	if (process.env.NODE_ENV === 'development') {
		rootWindow.webContents.openDevTools();
	}
};

export const getLocalStorage = (rootWindow) => rootWindow.webContents.executeJavaScript('({...localStorage})');

export const purgeLocalStorage = (rootWindow) => rootWindow.webContents.executeJavaScript('localStorage.clear()');

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
