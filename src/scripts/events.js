import { remote } from 'electron';
import servers from './servers';
import sidebar from './sidebar';
import webview from './webview';


const { app, getCurrentWindow, shell } = remote;
const { certificate, dock, menus, showAboutDialog, tray } = remote.require('./background');

export default () => {
	menus.on('quit', () => app.quit());
	menus.on('about', () => showAboutDialog());
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


	menus.on('reload-app', () => {
		const mainWindow = getCurrentWindow();
		mainWindow.removeAllListeners();
		menus.removeAllListeners();
		tray.destroy();
		dock.destroy();
		mainWindow.reload();
	});

	menus.on('toggle-devtools', () => getCurrentWindow().toggleDevTools());

	menus.on('reset-app-data', () => servers.resetAppData());


	const updatePreferences = () => {
		const mainWindow = getCurrentWindow();

		menus.setState({
			showTrayIcon: localStorage.getItem('hideTray') ?
				localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux'),
			showUserStatusInTray: (localStorage.getItem('showUserStatusInTray') || 'true') === 'true',
			showFullScreen: mainWindow.isFullScreen(),
			showWindowOnUnreadChanged: localStorage.getItem('showWindowOnUnreadChanged') === 'true',
			showMenuBar: localStorage.getItem('autohideMenu') !== 'true',
			showServerList: localStorage.getItem('sidebar-closed') !== 'true',
		});

		tray.setState({
			showIcon: localStorage.getItem('hideTray') ?
				localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux'),
			showUserStatus: (localStorage.getItem('showUserStatusInTray') || 'true') === 'true',
		});
	};

	menus.on('toggle', (property) => {
		switch (property) {
			case 'showTrayIcon': {
				const previousValue = localStorage.getItem('hideTray') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('hideTray', JSON.stringify(!newValue));
				break;
			}

			case 'showUserStatusInTray': {
				const previousValue = (localStorage.getItem('showUserStatusInTray') || 'true') === 'true';
				const newValue = !previousValue;
				localStorage.setItem('showUserStatusInTray', JSON.stringify(newValue));
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
				sidebar.toggle();
				break;
			}
		}

		updatePreferences();
	});

	const updateServers = () => {
		menus.setState({
			servers: Object.values(servers.hosts)
				.sort((a, b) => (sidebar ? (sidebar.sortOrder.indexOf(a.url) - sidebar.sortOrder.indexOf(b.url)) : 0))
				.map(({ title, url }) => ({ title, url })),
			currentServerUrl: servers.active,
		});
	};

	servers.on('loaded', updateServers);
	servers.on('active-cleared', updateServers);
	servers.on('active-setted', updateServers);
	servers.on('host-added', updateServers);
	servers.on('host-removed', updateServers);
	servers.on('title-setted', updateServers);
	sidebar.on('hosts-sorted', updateServers);


	sidebar.on('badge-setted', () => {
		const badge = sidebar.getGlobalBadge();
		tray.setState({ badge });
		dock.setState({ badge });
	});


	const updateWindowState = () =>
		tray.setState({ isMainWindowVisible: getCurrentWindow().isVisible() });
	getCurrentWindow().on('hide', updateWindowState);
	getCurrentWindow().on('show', updateWindowState);

	tray.on('created', () => getCurrentWindow().emit('set-state', { hideOnClose: true }));
	tray.on('destroyed', () => getCurrentWindow().emit('set-state', { hideOnClose: false }));
	tray.on('set-main-window-visibility', (visible) =>
		(visible ? getCurrentWindow().show() : getCurrentWindow().hide()));
	tray.on('quit', () => app.quit());


	webview.on('ipc-message-unread-changed', (hostUrl, [count]) => {
		if (typeof count === 'number' && localStorage.getItem('showWindowOnUnreadChanged') === 'true') {
			const mainWindow = remote.getCurrentWindow();
			if (!mainWindow.isFocused()) {
				mainWindow.once('focus', () => mainWindow.flashFrame(false));
				mainWindow.showInactive();
				mainWindow.flashFrame(true);
			}
		}
	});

	webview.on('ipc-message-user-status-manually-set', (hostUrl, [status]) => {
		tray.setState({ status });
		dock.setState({ status });
	});


	servers.restoreActive();
	updatePreferences();
	updateServers();
	updateWindowState();

};
