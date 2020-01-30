import { remote } from 'electron';
import { t } from 'i18next';
import React, { useEffect } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import certificates from './certificates';
import servers from './servers';
import {
	setupUpdates,
	setAutoUpdate,
	checkForUpdates,
	skipUpdateVersion,
	downloadUpdate,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
} from './updates';
import { processDeepLink } from './deepLinks';
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
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	ADD_SERVER_VIEW_SERVER_ADDED,
	ABOUT_DIALOG_DISMISSED,
	UPDATE_DIALOG_DISMISSED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	SCREEN_SHARING_DIALOG_DISMISSED,
	TRAY_ICON_CREATED,
	TRAY_ICON_DESTROYED,
	TRAY_ICON_QUIT_CLICKED,
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_FOCUSED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	MAIN_WINDOW_STATE_CHANGED,
} from './actions';
import { MainWindow } from './mainWindow';
import { AboutDialog } from './aboutDialog';
import { ScreenSharingDialog } from './screenSharingDialog';
import { UpdateDialog } from './updateDialog';
import { SideBar } from './sidebar';
import { WebViews } from './webview';
import { AddServerView } from './addServerView';
import { Tray } from './tray';
import { MenuBar } from './menuBar';
import { Dock } from './dock';
import { TouchBar } from './touchBar';

let loading = true;
let showWindowOnUnreadChanged;
let hasTrayIcon;
let hasMenuBar;
let hasSidebar;
let _servers = [];
let currentServerUrl;
let hideOnClose;
let badges = {};
let styles = {};
let addServerViewVisible;
let aboutDialogVisible;
let newUpdateVersion;
let updateDialogVisible;
let screenSharingDialogVisible;
let focusedWebContents = null;
let mainWindowState = {};

const updateComponents = () => {
	if (!focusedWebContents) {
		focusedWebContents = remote.getCurrentWebContents();
	}

	showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
	hasTrayIcon = localStorage.getItem('hideTray')
		? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux';
	hasMenuBar = localStorage.getItem('autohideMenu') !== 'true';
	hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';

	const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
	_servers = Object.values(servers.hosts)
		.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b));
	currentServerUrl = servers.active;

	render(<App />, document.getElementById('root'));
};

// eslint-disable-next-line complexity
const handleActionDispatched = async (_, { type, payload = null }) => {
	if (type === MENU_BAR_QUIT_CLICKED) {
		remote.app.quit();
		return;
	}

	if (type === TRAY_ICON_QUIT_CLICKED) {
		remote.app.quit();
		return;
	}

	if (type === MENU_BAR_ABOUT_CLICKED) {
		aboutDialogVisible = true;
		updateComponents();
		return;
	}

	if (type === MENU_BAR_OPEN_URL_CLICKED) {
		const url = payload;
		remote.shell.openExternal(url);
		return;
	}

	if (type === MENU_BAR_UNDO_CLICKED) {
		focusedWebContents.undo();
		return;
	}

	if (type === MENU_BAR_REDO_CLICKED) {
		focusedWebContents.redo();
		return;
	}

	if (type === MENU_BAR_CUT_CLICKED) {
		focusedWebContents.cut();
		return;
	}

	if (type === MENU_BAR_COPY_CLICKED) {
		focusedWebContents.copy();
		return;
	}

	if (type === MENU_BAR_PASTE_CLICKED) {
		focusedWebContents.paste();
		return;
	}

	if (type === MENU_BAR_SELECT_ALL_CLICKED) {
		focusedWebContents.selectAll();
		return;
	}

	if (type === MENU_BAR_ADD_NEW_SERVER_CLICKED) {
		servers.clearActive();
		addServerViewVisible = true;
		updateComponents();
		return;
	}

	if (type === MENU_BAR_RELOAD_SERVER_CLICKED) {
		const { clearCertificates = false } = payload || {};
		if (clearCertificates) {
			certificates.clear();
		}

		return;
	}

	if (type === MENU_BAR_RESET_ZOOM_CLICKED) {
		remote.getCurrentWebContents().zoomLevel = 0;
		return;
	}

	if (type === MENU_BAR_ZOOM_IN_CLICKED) {
		remote.getCurrentWebContents().zoomLevel++;
		return;
	}

	if (type === MENU_BAR_ZOOM_OUT_CLICKED) {
		remote.getCurrentWebContents().zoomLevel--;
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
		return;
	}

	if (type === TOUCH_BAR_SELECT_SERVER_TOUCHED) {
		const serverUrl = payload;
		servers.setActive(serverUrl);
		return;
	}

	if (type === ADD_SERVER_VIEW_SERVER_ADDED) {
		const url = servers.addHost(payload);
		if (url !== false) {
			servers.setActive(url);
		}
		return;
	}

	if (type === ABOUT_DIALOG_DISMISSED) {
		aboutDialogVisible = false;
		updateComponents();
		return;
	}

	if (type === ABOUT_DIALOG_TOGGLE_UPDATE_ON_START) {
		const updateOnStart = payload;
		setAutoUpdate(updateOnStart);
		return;
	}

	if (type === ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED) {
		checkForUpdates(null, { forced: true });
		return;
	}

	if (type === UPDATE_DIALOG_DISMISSED) {
		updateDialogVisible = false;
		updateComponents();
		return;
	}

	if (type === UPDATE_DIALOG_SKIP_UPDATE_CLICKED) {
		const skippedVersion = payload;
		skipUpdateVersion(skippedVersion);
		return;
	}

	if (type === UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED) {
		downloadUpdate();
		return;
	}

	if (type === SCREEN_SHARING_DIALOG_DISMISSED) {
		screenSharingDialogVisible = false;
		updateComponents();
		return;
	}

	if (type === TRAY_ICON_CREATED) {
		hideOnClose = true;
		updateComponents();
		return;
	}

	if (type === TRAY_ICON_DESTROYED) {
		hideOnClose = false;
		updateComponents();
		return;
	}

	if (type === SIDE_BAR_SERVER_SELECTED) {
		const hostUrl = payload;
		servers.setActive(hostUrl);
		return;
	}

	if (type === SIDE_BAR_REMOVE_SERVER_CLICKED) {
		const hostUrl = payload;
		servers.removeHost(hostUrl);
		return;
	}

	if (type === SIDE_BAR_ADD_NEW_SERVER_CLICKED) {
		servers.clearActive();
		addServerViewVisible = true;
		updateComponents();
		return;
	}

	if (type === SIDE_BAR_SERVERS_SORTED) {
		const sorting = payload;
		localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
		updateComponents();
		return;
	}

	if (type === WEBVIEW_UNREAD_CHANGED) {
		const { url, badge } = payload;

		badges = {
			...badges,
			[url]: badge || null,
		};

		updateComponents();
		return;
	}

	if (type === WEBVIEW_TITLE_CHANGED) {
		const { url, title } = payload;
		servers.setHostTitle(url, title);
		return;
	}

	if (type === WEBVIEW_FOCUS_REQUESTED) {
		const { url } = payload;
		servers.setActive(url);
		return;
	}

	if (type === WEBVIEW_SIDEBAR_STYLE_CHANGED) {
		const { url, style } = payload;
		styles = {
			...styles,
			[url]: style || null,
		};
		updateComponents();
		return;
	}

	if (type === WEBVIEW_DID_NAVIGATE) {
		const { url, pageUrl } = payload;
		if (pageUrl.includes(url)) {
			servers.hosts[url].lastPath = pageUrl;
			servers.save();
		}
		return;
	}

	if (type === WEBVIEW_FOCUSED) {
		const { id } = payload;
		focusedWebContents = remote.webContents.fromId(id);
		return;
	}

	if (type === WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED) {
		screenSharingDialogVisible = true;
		updateComponents();
		return;
	}

	if (type === MAIN_WINDOW_STATE_CHANGED) {
		mainWindowState = payload;
		updateComponents();
	}
};

function App() {
	useEffect(() => {
		setupSpellChecking();
		setupUpdates();

		servers.initialize();
		certificates.initialize();
		servers.setActive(servers.active);

		return () => {
			removeAllListeners('action-dispatched');
		};
	}, []);

	useEffect(() => {
		document.querySelector('.app-page').classList.toggle('app-page--loading', loading);
	}, [loading]);

	useEffect(() => {
		const handleConnectionStatus = () => {
			document.body.classList.toggle('offline', !navigator.onLine);
		};

		handleConnectionStatus();

		window.addEventListener('online', handleConnectionStatus);
		window.addEventListener('offline', handleConnectionStatus);

		return () => {
			window.removeEventListener('online', handleConnectionStatus);
			window.removeEventListener('offline', handleConnectionStatus);
		};
	}, []);

	useEffect(() => {
		servers.on('loaded', () => {
			loading = false;
			updateComponents();
		});

		servers.on('host-added', () => {
			updateComponents();
		});

		servers.on('host-removed', () => {
			servers.clearActive();
			addServerViewVisible = true;
			updateComponents();
		});

		servers.on('active-setted', (url) => {
			currentServerUrl = url;
			addServerViewVisible = false;
			updateComponents();
		});

		servers.on('active-cleared', () => {
			currentServerUrl = null;
			addServerViewVisible = true;
			updateComponents();
		});

		servers.on('title-setted', () => {
			updateComponents();
		});
	}, []);

	const mentionCount = Object.values(badges)
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
	const globalBadge = mentionCount
		|| (Object.values(badges).some((badge) => !!badge) && '•')
		|| null;

	const dispatch = (action) => {
		console.log(action);
		emit('action-dispatched', action);
	};

	return <MainWindow
		hideOnClose={hideOnClose}
		showWindowOnUnreadChanged={showWindowOnUnreadChanged}
		dispatch={dispatch}
	>
		<MenuBar
			showTrayIcon={hasTrayIcon}
			showFullScreen={mainWindowState.fullscreen}
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
			showMenuBar={hasMenuBar}
			showServerList={hasSidebar}
			servers={_servers}
			currentServerUrl={currentServerUrl}
			dispatch={dispatch}
		/>
		<SideBar
			servers={_servers}
			currentServerUrl={currentServerUrl}
			badges={badges}
			visible={hasSidebar}
			styles={styles}
			dispatch={dispatch}
		/>
		<WebViews
			servers={_servers}
			currentServerUrl={currentServerUrl}
			hasSidebar={hasSidebar}
			dispatch={dispatch}
		/>
		<AddServerView
			visible={addServerViewVisible}
			dispatch={dispatch}
		/>
		<AboutDialog
			canUpdate={canUpdate()}
			canAutoUpdate={canAutoUpdate()}
			canSetAutoUpdate={canSetAutoUpdate()}
			visible={aboutDialogVisible}
			dispatch={dispatch}
		/>
		<UpdateDialog
			newVersion={newUpdateVersion}
			visible={updateDialogVisible}
			dispatch={dispatch}
		/>
		<ScreenSharingDialog
			visible={screenSharingDialogVisible}
			dispatch={dispatch}
		/>
		<Dock
			badge={globalBadge}
			hasTrayIcon={hasTrayIcon}
		/>
		<Tray
			badge={globalBadge}
			isMainWindowVisible={mainWindowState.visible && mainWindowState.focused}
			showIcon={hasTrayIcon}
			dispatch={dispatch}
		/>
		<TouchBar
			servers={_servers}
			activeServerUrl={currentServerUrl}
			dispatch={dispatch}
		/>
	</MainWindow>;
}

export default () => {
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
		argv.slice(2).forEach(processDeepLink);
	};

	remote.app.on('login', handleLogin);
	remote.app.on('open-url', handleOpenUrl);
	remote.app.on('second-instance', handleSecondInstance);

	handle('spell-checking/get-corrections', (_, text) => getSpellCheckingCorrections(text));
	handle('spell-checking/get-dictionaries', () => getSpellCheckingDictionaries());
	handle('spell-checking/get-dictionaries-path', () => getSpellCheckingDictionariesPath());
	handle('spell-checking/get-enabled-dictionaries', () => getEnabledSpellCheckingDictionaries());
	handle('spell-checking/get-misspelled-words', (_, words) => getMisspelledWords(words));
	handle('spell-checking/install-dictionaries', (_, ...args) => installSpellCheckingDictionaries(...args));
	handle('spell-checking/enable-dictionaries', (_, ...args) => enableSpellCheckingDictionaries(...args));
	handle('spell-checking/disable-dictionaries', (_, ...args) => disableSpellCheckingDictionaries(...args));
	listen('close-about-dialog', () => {
		aboutDialogVisible = false;
		updateComponents();
	});
	listen('open-update-dialog', (_, { newVersion }) => {
		newUpdateVersion = newVersion;
		updateDialogVisible = true;
		updateComponents();
	});
	listen('action-dispatched', handleActionDispatched);

	window.addEventListener('unload', () => {
		remote.app.removeListener('login', handleLogin);
		remote.app.removeListener('open-url', handleOpenUrl);
		remote.app.removeListener('second-instance', handleSecondInstance);

		removeHandler('spell-checking/get-corrections');
		removeHandler('spell-checking/get-dictionaries');
		removeHandler('spell-checking/get-dictionaries-path');
		removeHandler('spell-checking/get-enabled-dictionaries');
		removeHandler('spell-checking/get-misspelled-words');
		removeHandler('spell-checking/install-dictionaries');
		removeHandler('spell-checking/enable-dictionaries');
		removeHandler('spell-checking/disable-dictionaries');
		removeAllListeners('close-about-dialog');
		removeAllListeners('open-update-dialog');

		unmountComponentAtNode(document.getElementById('root'));
	});

	updateComponents();

	remote.process.argv.slice(2).forEach(processDeepLink);
};
