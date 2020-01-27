/** @jsx createElement */
import { remote, ipcRenderer } from 'electron';
import { t } from 'i18next';

import { openAboutDialog, closeAboutDialog } from './aboutDialog';
import { mountAddServerView, toggleAddServerViewVisible } from './addServerView';
import certificates from './certificates';
import dock from './dock';
import { MenuBar } from './menuBar';
import { openScreenSharingDialog, closeScreenSharingDialog, selectScreenSharingSource } from './screenSharingDialog';
import servers from './servers';
import sidebar from './sidebar';
import tray from './tray';
import { mountTouchBar, updateTouchBar } from './touchBar';
import { openUpdateDialog, closeUpdateDialog } from './updateDialog';
import {
	setupUpdates,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
	setAutoUpdate,
	checkForUpdates,
	skipUpdateVersion,
	downloadUpdate,
} from './updates';
import webview, { mountWebViews } from './webview';
import { processDeepLink } from './deepLinks';
import { mountMainWindow, updateMainWindow, unmountMainWindow } from './mainWindow';
import { handle, removeHandler, listen, removeAllListeners, emit } from './ipc';
import {
	setupSpellChecking,
	getSpellCheckingCorrections,
	getSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	getEnabledSpellCheckingDictionaries,
	installSpellCheckingDictionaries,
	enableSpellCheckingDictionaries,
	disableSpellCheckingDictionaries,
	getMisspelledWords,
} from './spellChecking';
import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_UNDO_CLICKED,
	MENU_BAR_REDO_CLICKED,
	MENU_BAR_CUT_CLICKED,
	MENU_BAR_COPY_CLICKED,
	MENU_BAR_PASTE_CLICKED,
	MENU_BAR_SELECT_ALL_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
} from './actions';
import { createElement, Fragment } from './reactiveUi';

const { app, getCurrentWindow, shell } = remote;

let showWindowOnUnreadChanged;
let hasTrayIcon;
let hasMenuBar;
let hasSidebar;
let _servers;
let currentServerUrl;
let isFullScreen;
let isMainWindowVisible;

let appElement;

const updateComponents = () => {
	showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
	hasTrayIcon = localStorage.getItem('hideTray')
		? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux';
	hasMenuBar = localStorage.getItem('autohideMenu') !== 'true';
	hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';

	const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
	_servers = Object.values(servers.hosts)
		.sort(({ url: a }, { url: b }) => (sidebar ? sorting.indexOf(a) - sorting.indexOf(b) : 0))
		.map(({ title, url }) => ({ title, url }));
	currentServerUrl = servers.active;

	isFullScreen = remote.getCurrentWindow().isFullScreen();
	isMainWindowVisible = remote.getCurrentWindow().isVisible();

	tray.setState({
		showIcon: hasTrayIcon,
		isMainWindowVisible,
	});

	dock.setState({
		hasTrayIcon,
	});

	sidebar.setState({
		visible: hasSidebar,
		hosts: _servers.reduce((hosts, server) => ({ ...hosts, [server.url]: server }), {}),
		sorting: _servers.map(({ url }) => url),
		active: currentServerUrl,
	});

	webview.setSidebarPaddingEnabled(!hasSidebar);

	updateTouchBar({
		servers: _servers,
		activeServerUrl: currentServerUrl,
		activeWebView: webview.getActive(),
	});

	appElement.update();
};

// eslint-disable-next-line complexity
const dispatch = async ({ type, payload }) => {
	if (type === MENU_BAR_QUIT_CLICKED) {
		app.quit();
		return;
	}

	if (type === MENU_BAR_ABOUT_CLICKED) {
		emit('open-about-dialog');
		return;
	}

	if (type === MENU_BAR_OPEN_URL_CLICKED) {
		const url = payload;
		shell.openExternal(url);
		return;
	}

	if (type === MENU_BAR_UNDO_CLICKED) {
		remote.webContents.getFocusedWebContents().undo();
		return;
	}

	if (type === MENU_BAR_REDO_CLICKED) {
		remote.webContents.getFocusedWebContents().redo();
		return;
	}

	if (type === MENU_BAR_CUT_CLICKED) {
		remote.webContents.getFocusedWebContents().cut();
		return;
	}

	if (type === MENU_BAR_COPY_CLICKED) {
		remote.webContents.getFocusedWebContents().copy();
		return;
	}

	if (type === MENU_BAR_PASTE_CLICKED) {
		remote.webContents.getFocusedWebContents().paste();
		return;
	}

	if (type === MENU_BAR_SELECT_ALL_CLICKED) {
		remote.webContents.getFocusedWebContents().selectAll();
		return;
	}

	if (type === MENU_BAR_ADD_NEW_SERVER_CLICKED) {
		getCurrentWindow().show();
		servers.clearActive();
		toggleAddServerViewVisible(true);
		return;
	}

	if (type === MENU_BAR_SELECT_ALL_CLICKED) {
		const { url } = payload || {};
		getCurrentWindow().show();
		servers.setActive(url);
		return;
	}

	if (type === MENU_BAR_RELOAD_SERVER_CLICKED) {
		const { ignoringCache = false, clearCertificates = false } = payload || {};
		if (clearCertificates) {
			certificates.clear();
		}

		const activeWebview = webview.getActive();
		if (!activeWebview) {
			return;
		}

		if (ignoringCache) {
			activeWebview.reloadIgnoringCache();
			return;
		}

		activeWebview.reload();
		return;
	}

	if (type === MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED) {
		const activeWebview = webview.getActive();
		if (activeWebview) {
			activeWebview.openDevTools();
		}
		return;
	}

	if (type === MENU_BAR_GO_BACK_CLICKED) {
		webview.goBack();
		return;
	}

	if (type === MENU_BAR_GO_FORWARD_CLICKED) {
		webview.goForward();
		return;
	}

	if (type === MENU_BAR_RELOAD_APP_CLICKED) {
		getCurrentWindow().reload();
		return;
	}

	if (type === MENU_BAR_TOGGLE_DEVTOOLS_CLICKED) {
		getCurrentWindow().toggleDevTools();
		return;
	}

	if (type === MENU_BAR_RESET_ZOOM_CLICKED) {
		remote.webContents.getFocusedWebContents().zoomLevel = 0;
		return;
	}

	if (type === MENU_BAR_ZOOM_IN_CLICKED) {
		remote.webContents.getFocusedWebContents().zoomLevel++;
		return;
	}

	if (type === MENU_BAR_ZOOM_OUT_CLICKED) {
		remote.webContents.getFocusedWebContents().zoomLevel--;
		return;
	}

	if (type === MENU_BAR_RESET_APP_DATA_CLICKED) {
		const { response } = await remote.dialog.showMessageBox({
			type: 'question',
			buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
			defaultId: 1,
			title: t('dialog.resetAppData.title'),
			message: t('dialog.resetAppData.message'),
		});

		if (response !== 0) {
			return;
		}

		remote.app.relaunch({ args: [remote.process.argv[1], '--reset-app-data'] });
		remote.app.quit();
		return;
	}

	if (type === MENU_BAR_TOGGLE_SETTING_CLICKED) {
		const property = payload;

		switch (property) {
			case 'showTrayIcon': {
				const previousValue = localStorage.getItem('hideTray') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('hideTray', JSON.stringify(!newValue));
				break;
			}

			case 'showFullScreen': {
				const mainWindow = getCurrentWindow();
				mainWindow.setFullScreen(!mainWindow.isFullScreen());
				break;
			}

			case 'showWindowOnUnreadChanged': {
				const previousValue = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
				const newValue = !previousValue;
				localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(newValue));
				break;
			}

			case 'showMenuBar': {
				const previousValue = localStorage.getItem('autohideMenu') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('autohideMenu', JSON.stringify(!newValue));
				break;
			}

			case 'showServerList': {
				const previousValue = localStorage.getItem('sidebar-closed') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('sidebar-closed', JSON.stringify(!newValue));
				break;
			}
		}

		updateComponents();
		return;
	}

	if (type === MENU_BAR_SELECT_SERVER_CLICKED) {
		const server = payload;
		servers.setActive(server.url);
		updateComponents();
	}
};

function App() {
	return <Fragment>
		<MenuBar
			showTrayIcon={hasTrayIcon}
			showFullScreen={isFullScreen}
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
			showMenuBar={hasMenuBar}
			showServerList={hasSidebar}
			servers={_servers}
			currentServerUrl={currentServerUrl}
			dispatch={dispatch}
		/>
	</Fragment>;
}

const destroyAll = () => {
	try {
		tray.destroy();
		dock.destroy();
		remote.getCurrentWindow().removeListener('hide', updateComponents);
		remote.getCurrentWindow().removeListener('show', updateComponents);
	} catch (error) {
		remote.getGlobal('console').error(error);
	}
};

let focusedWebContents = null;

const patchFocusedWebContents = () => {
	focusedWebContents = remote.getCurrentWebContents();

	window.addEventListener('focus', () => {
		focusedWebContents = remote.getCurrentWebContents();
	});

	webview.on('focus', (webContents) => {
		focusedWebContents = webContents;
	});

	remote.webContents.getFocusedWebContents = () => focusedWebContents;
};

export default () => {
	patchFocusedWebContents();

	window.addEventListener('beforeunload', destroyAll);
	window.addEventListener('focus', () => webview.focusActive());

	const handleConnectionStatus = () => {
		document.body.classList.toggle('offline', !navigator.onLine);
	};
	window.addEventListener('online', handleConnectionStatus);
	window.addEventListener('offline', handleConnectionStatus);
	handleConnectionStatus();

	const handleActivate = () => {
		remote.getCurrentWindow().show();
	};

	const handleLogin = (event, webContents, request, authInfo, callback) => {
		for (const url of Object.keys(servers.hosts)) {
			const server = servers.hosts[url];
			if (request.url.indexOf(url) === 0 && server.username) {
				callback(server.username, server.password);
				break;
			}
		}
	};

	const handleOpenUrl = (event, url) => {
		processDeepLink(url);
	};

	const handleSecondInstance = (event, argv) => {
		ipcRenderer.send('main-window/focus');
		argv.slice(2).forEach(processDeepLink);
	};

	remote.app.on('activate', handleActivate);
	remote.app.on('login', handleLogin);
	remote.app.on('open-url', handleOpenUrl);
	remote.app.on('second-instance', handleSecondInstance);

	handle('can-update', () => canUpdate());
	handle('can-auto-update', () => canAutoUpdate());
	handle('can-set-auto-update', () => canSetAutoUpdate());
	handle('spell-checking/get-corrections', (_, text) => getSpellCheckingCorrections(text));
	handle('spell-checking/get-dictionaries', () => getSpellCheckingDictionaries());
	handle('spell-checking/get-dictionaries-path', () => getSpellCheckingDictionariesPath());
	handle('spell-checking/get-enabled-dictionaries', () => getEnabledSpellCheckingDictionaries());
	handle('spell-checking/get-misspelled-words', (_, words) => getMisspelledWords(words));
	handle('spell-checking/install-dictionaries', (_, ...args) => installSpellCheckingDictionaries(...args));
	handle('spell-checking/enable-dictionaries', (_, ...args) => enableSpellCheckingDictionaries(...args));
	handle('spell-checking/disable-dictionaries', (_, ...args) => disableSpellCheckingDictionaries(...args));
	listen('set-auto-update', (_, canAutoUpdate) => setAutoUpdate(canAutoUpdate));
	listen('check-for-updates', (event, ...args) => checkForUpdates(event, ...args));
	listen('skip-update-version', (_, ...args) => skipUpdateVersion(...args));
	listen('remind-update-later', () => {});
	listen('download-update', () => downloadUpdate());
	listen('open-about-dialog', (_, ...args) => openAboutDialog(...args));
	listen('close-about-dialog', (_, ...args) => closeAboutDialog(...args));
	listen('open-screen-sharing-dialog', (_, ...args) => openScreenSharingDialog(...args));
	listen('close-screen-sharing-dialog', (_, ...args) => closeScreenSharingDialog(...args));
	listen('select-screen-sharing-source', (_, ...args) => selectScreenSharingSource(...args));
	listen('open-update-dialog', (_, ...args) => openUpdateDialog(...args));
	listen('close-update-dialog', (_, ...args) => closeUpdateDialog(...args));

	window.addEventListener('unload', () => {
		remote.app.removeListener('activate', handleActivate);
		remote.app.removeListener('login', handleLogin);
		remote.app.removeListener('open-url', handleOpenUrl);
		remote.app.removeListener('second-instance', handleSecondInstance);

		removeHandler('can-update');
		removeHandler('can-auto-update');
		removeHandler('can-set-auto-update');
		removeHandler('spell-checking/get-corrections');
		removeHandler('spell-checking/get-dictionaries');
		removeHandler('spell-checking/get-dictionaries-path');
		removeHandler('spell-checking/get-enabled-dictionaries');
		removeHandler('spell-checking/get-misspelled-words');
		removeHandler('spell-checking/install-dictionaries');
		removeHandler('spell-checking/enable-dictionaries');
		removeHandler('spell-checking/disable-dictionaries');
		removeAllListeners('set-auto-update');
		removeAllListeners('check-for-updates');
		removeAllListeners('skip-update-version');
		removeAllListeners('remind-update-later');
		removeAllListeners('download-update');
		removeAllListeners('open-about-dialog');
		removeAllListeners('close-about-dialog');
		removeAllListeners('open-screen-sharing-dialog');
		removeAllListeners('close-screen-sharing-dialog');
		removeAllListeners('select-screen-sharing-source');
		removeAllListeners('open-update-dialog');
		removeAllListeners('close-update-dialog');

		unmountMainWindow();
	});

	servers.on('loaded', () => {
		document.querySelector('.app-page').classList.remove('app-page--loading');
		updateComponents();
	});

	servers.on('host-added', (hostUrl) => {
		webview.add(servers.get(hostUrl));
		updateComponents();
	});

	servers.on('host-removed', (hostUrl) => {
		webview.remove(hostUrl);
		servers.clearActive();
		toggleAddServerViewVisible(true);
		updateComponents();
	});

	servers.on('active-setted', (hostUrl) => {
		webview.setActive(hostUrl);
		toggleAddServerViewVisible(false);
		updateComponents();
	});

	servers.on('active-cleared', (hostUrl) => {
		webview.deactiveAll(hostUrl);
		toggleAddServerViewVisible(true);
		updateComponents();
	});

	servers.on('title-setted', () => {
		updateComponents();
	});

	sidebar.on('select-server', (hostUrl) => {
		servers.setActive(hostUrl);
	});

	sidebar.on('reload-server', (hostUrl) => {
		webview.getByUrl(hostUrl).reload();
	});

	sidebar.on('remove-server', (hostUrl) => {
		servers.removeHost(hostUrl);
	});

	sidebar.on('open-devtools-for-server', (hostUrl) => {
		webview.getByUrl(hostUrl).openDevTools();
	});

	sidebar.on('add-server', () => {
		servers.clearActive();
		toggleAddServerViewVisible(true);
	});

	sidebar.on('servers-sorted', (sorting) => {
		localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
		updateComponents();
	});

	remote.getCurrentWindow().on('hide', updateComponents);
	remote.getCurrentWindow().on('show', updateComponents);

	tray.on('created', () => updateMainWindow({ hideOnClose: true }));
	tray.on('destroyed', () => updateMainWindow({ hideOnClose: false }));
	tray.on('set-main-window-visibility', (visible) =>
		(visible ? getCurrentWindow().show() : getCurrentWindow().hide()));
	tray.on('quit', () => app.quit());


	webview.on('ipc-message-unread-changed', (hostUrl, [badge]) => {
		if (typeof badge === 'number' && localStorage.getItem('showWindowOnUnreadChanged') === 'true') {
			const mainWindow = remote.getCurrentWindow();
			if (!mainWindow.isFocused()) {
				mainWindow.once('focus', () => mainWindow.flashFrame(false));
				mainWindow.showInactive();
				mainWindow.flashFrame(true);
			}
		}

		sidebar.setState({
			badges: {
				...sidebar.state.badges,
				[hostUrl]: badge || null,
			},
		});

		const mentionCount = Object.values(sidebar.state.badges)
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		const globalBadge = mentionCount
			|| (Object.values(sidebar.state.badges).some((badge) => !!badge) && '•')
			|| null;

		tray.setState({ badge: globalBadge });
		dock.setState({ badge: globalBadge });
	});

	webview.on('ipc-message-title-changed', (hostUrl, [title]) => {
		servers.setHostTitle(hostUrl, title);
	});

	webview.on('ipc-message-focus', (hostUrl) => {
		servers.setActive(hostUrl);
	});

	webview.on('ipc-message-sidebar-style', (hostUrl, [style]) => {
		sidebar.setState({
			styles: {
				...sidebar.state.styles,
				[hostUrl]: style || null,
			},
		});
	});

	webview.on('dom-ready', () => {
		const hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';
		sidebar.setState({
			visible: hasSidebar,
		});
		webview.setSidebarPaddingEnabled(!hasSidebar);
	});

	webview.on('did-navigate-in-page', (hostUrl, event) => {
		if (event.url.includes(hostUrl)) {
			servers.hosts[hostUrl].lastPath = event.url;
			servers.save();
		}
	});

	mountMainWindow();

	setupSpellChecking();
	setupUpdates();

	appElement = createElement(App);
	appElement.mount(document.body);

	mountTouchBar({
		onChangeServer: (serverUrl) => {
			servers.setActive(serverUrl);
		},
	});
	servers.initialize();
	certificates.initialize();

	mountAddServerView();
	sidebar.mount();
	mountWebViews();
	servers.forEach(::webview.add);

	servers.restoreActive();

	updateComponents();

	remote.process.argv.slice(2).forEach(processDeepLink);
};
