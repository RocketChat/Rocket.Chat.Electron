import { remote, ipcRenderer } from 'electron';

import servers from './servers';
import sidebar from './sidebar';
import { setupUpdates, canUpdate, canAutoUpdate, canSetAutoUpdate, setAutoUpdate, checkForUpdates, skipUpdateVersion, downloadUpdate } from './updates';
import webview from './webview';
import setTouchBar from './touchBar';
import { openAboutDialog, closeAboutDialog } from './aboutDialog';
import { openScreenSharingDialog, closeScreenSharingDialog, selectScreenSharingSource } from './screenSharingDialog';
import { openUpdateDialog, closeUpdateDialog } from './updateDialog';

const { app, getCurrentWindow, shell } = remote;
const { certificate, dock, menus, tray } = remote.require('./main');

const updatePreferences = () => {
	const mainWindow = getCurrentWindow();
	const showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
	const hasTrayIcon = localStorage.getItem('hideTray')
		? localStorage.getItem('hideTray') !== 'true' : process.platform !== 'linux';
	const hasMenuBar = localStorage.getItem('autohideMenu') !== 'true';
	const hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';

	menus.setState({
		showTrayIcon: hasTrayIcon,
		showFullScreen: mainWindow.isFullScreen(),
		showWindowOnUnreadChanged,
		showMenuBar: hasMenuBar,
		showServerList: hasSidebar,
	});

	tray.setState({
		showIcon: hasTrayIcon,
	});

	dock.setState({
		hasTrayIcon,
	});

	sidebar.setState({
		visible: hasSidebar,
	});

	webview.setSidebarPaddingEnabled(!hasSidebar);
};


const updateServers = () => {
	const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];

	menus.setState({
		servers: Object.values(servers.hosts)
			.sort(({ url: a }, { url: b }) => (sidebar ? sorting.indexOf(a) - sorting.indexOf(b) : 0))
			.map(({ title, url }) => ({ title, url })),
		currentServerUrl: servers.active,
	});

	sidebar.setState({
		hosts: servers.hosts,
		sorting,
		active: servers.active,
	});
};


const updateWindowState = () => tray.setState({ isMainWindowVisible: getCurrentWindow().isVisible() });

const destroyAll = () => {
	try {
		menus.removeAllListeners();
		tray.destroy();
		dock.destroy();
		const mainWindow = getCurrentWindow();
		mainWindow.removeListener('hide', updateWindowState);
		mainWindow.removeListener('show', updateWindowState);
	} catch (error) {
		remote.getGlobal('console').error(error);
	}
};

export default () => {
	window.addEventListener('beforeunload', destroyAll);
	window.addEventListener('focus', () => webview.focusActive());

	remote.ipcMain.handle('can-update', () => canUpdate());
	remote.ipcMain.handle('can-auto-update', () => canAutoUpdate());
	remote.ipcMain.handle('can-set-auto-update', () => canSetAutoUpdate());
	remote.ipcMain.on('set-auto-update', (_, canAutoUpdate) => setAutoUpdate(canAutoUpdate));
	remote.ipcMain.on('check-for-updates', (event, ...args) => checkForUpdates(event, ...args));
	remote.ipcMain.on('skip-update-version', (_, ...args) => skipUpdateVersion(...args));
	remote.ipcMain.on('remind-update-later', () => {});
	remote.ipcMain.on('download-update', () => downloadUpdate());
	remote.ipcMain.on('open-about-dialog', (_, ...args) => openAboutDialog(...args));
	remote.ipcMain.on('close-about-dialog', (_, ...args) => closeAboutDialog(...args));
	remote.ipcMain.on('open-screen-sharing-dialog', (_, ...args) => openScreenSharingDialog(...args));
	remote.ipcMain.on('close-screen-sharing-dialog', (_, ...args) => closeScreenSharingDialog(...args));
	remote.ipcMain.on('select-screen-sharing-source', (_, ...args) => selectScreenSharingSource(...args));
	remote.ipcMain.on('open-update-dialog', (_, ...args) => openUpdateDialog(...args));
	remote.ipcMain.on('close-update-dialog', (_, ...args) => closeUpdateDialog(...args));

	window.addEventListener('unload', () => {
		remote.ipcMain.removeHandler('can-update');
		remote.ipcMain.removeHandler('can-auto-update');
		remote.ipcMain.removeHandler('can-set-auto-update');
		remote.ipcMain.removeAllListeners('set-auto-update');
		remote.ipcMain.removeAllListeners('check-for-updates');
		remote.ipcMain.removeAllListeners('skip-update-version');
		remote.ipcMain.removeAllListeners('remind-update-later');
		remote.ipcMain.removeAllListeners('download-update');
		remote.ipcMain.removeAllListeners('open-about-dialog');
		remote.ipcMain.removeAllListeners('close-about-dialog');
		remote.ipcMain.removeAllListeners('open-screen-sharing-dialog');
		remote.ipcMain.removeAllListeners('close-screen-sharing-dialog');
		remote.ipcMain.removeAllListeners('select-screen-sharing-source');
		remote.ipcMain.removeAllListeners('open-update-dialog');
		remote.ipcMain.removeAllListeners('close-update-dialog');
	});

	menus.on('quit', () => app.quit());
	menus.on('about', () => ipcRenderer.send('open-about-dialog'));
	menus.on('open-url', (url) => shell.openExternal(url));

	menus.on('add-new-server', () => {
		getCurrentWindow().show();
		servers.clearActive();
		webview.showLanding();
	});

	menus.on('select-server', ({ url }) => {
		getCurrentWindow().show();
		servers.setActive(url);
	});

	menus.on('reload-server', ({ ignoringCache = false, clearCertificates = false } = {}) => {
		if (clearCertificates) {
			certificate.clear();
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
	});

	menus.on('open-devtools-for-server', () => {
		const activeWebview = webview.getActive();
		if (activeWebview) {
			activeWebview.openDevTools();
		}
	});

	menus.on('go-back', () => webview.goBack());
	menus.on('go-forward', () => webview.goForward());

	menus.on('reload-app', () => getCurrentWindow().reload());

	menus.on('toggle-devtools', () => getCurrentWindow().toggleDevTools());

	menus.on('reset-app-data', () => servers.resetAppData());

	menus.on('toggle', (property) => {
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

		updatePreferences();
	});

	servers.on('loaded', () => {
		webview.loaded();
		updateServers();
	});

	servers.on('host-added', (hostUrl) => {
		webview.add(servers.get(hostUrl));
		updateServers();
	});

	servers.on('host-removed', (hostUrl) => {
		webview.remove(hostUrl);
		servers.clearActive();
		webview.showLanding();
		updateServers();
	});

	servers.on('active-setted', (hostUrl) => {
		webview.setActive(hostUrl);
		updateServers();
	});

	servers.on('active-cleared', (hostUrl) => {
		webview.deactiveAll(hostUrl);
		updateServers();
	});

	servers.on('title-setted', () => {
		updateServers();
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
		webview.showLanding();
	});

	sidebar.on('servers-sorted', (sorting) => {
		localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
		updateServers();
	});

	getCurrentWindow().on('hide', updateWindowState);
	getCurrentWindow().on('show', updateWindowState);

	tray.on('created', () => getCurrentWindow().emit('set-state', { hideOnClose: true }));
	tray.on('destroyed', () => getCurrentWindow().emit('set-state', { hideOnClose: false }));
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

	if (process.platform === 'darwin') {
		setTouchBar();
	}

	setupUpdates();
	servers.initialize();
	webview.initialize();
	servers.restoreActive();
	sidebar.mount();
	updatePreferences();
	updateServers();
	updateWindowState();
};
