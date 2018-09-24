import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n/index.js';
import webview from './webview';
import sidebar from './sidebar';
import tray from './tray';
import servers from './servers';

const { app, getCurrentWindow, shell, Menu } = remote;
const { certificate } = remote.require('./background');

const createMenuTemplate = (state, actions) => ([
	{
		label: process.platform === 'darwin' ? state.appName : i18n.__('&File'),
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('About %s', state.appName),
					click: actions.about,
				},
				{
					type: 'separator',
				},
				{
					submenu: [],
					role: 'services',
				},
				{
					type: 'separator',
				},
				{
					accelerator: 'Command+H',
					role: 'hide',
				},
				{
					accelerator: 'Command+Alt+H',
					role: 'hideothers',
				},
				{
					role: 'unhide',
				},
				{
					type: 'separator',
				},
			] : []),
			// {
			// 	label: i18n.__('Preferences'),
			// 	accelerator: 'CommandOrControl+,',
			// 	click: actions.preferences,
			// },
			{
				label: i18n.__('Add &new server'),
				accelerator: 'CommandOrControl+N',
				click: actions.addNewServer,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('&Quit %s', state.appName),
				accelerator: 'CommandOrControl+Q',
				click: actions.quit,
			},
		],
	},
	{
		label: i18n.__('&Edit'),
		submenu: [
			{
				label: i18n.__('&Undo'),
				accelerator: 'CommandOrControl+Z',
				role: 'undo',
			},
			{
				label: i18n.__('&Redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				role: 'redo',
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Cu&t'),
				accelerator: 'CommandOrControl+X',
				role: 'cut',
			},
			{
				label: i18n.__('&Copy'),
				accelerator: 'CommandOrControl+C',
				role: 'copy',
			},
			{
				label: i18n.__('&Paste'),
				accelerator: 'CommandOrControl+V',
				role: 'paste',
			},
			{
				label: i18n.__('Select &all'),
				accelerator: 'CommandOrControl+A',
				role: 'selectall',
			},
		],
	},
	{
		label: i18n.__('&View'),
		submenu: [
			{
				label: i18n.__('&Reload'),
				accelerator: 'CommandOrControl+R',
				click: actions.server.reload(),
			},
			{
				label: i18n.__('Reload ignoring cache'),
				click: actions.server.reload({ ignoringCache: true }),
			},
			{
				label: i18n.__('Clear trusted certificates'),
				click: actions.server.reload({ ignoringCache: true, clearCertificates: true }),
			},
			{
				label: i18n.__('Open &DevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: actions.server.openDevTools,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('&Back'),
				accelerator: process.platform === 'darwin' ? 'Command+Left' : 'Alt+Left',
				click: actions.server.goBack,
			},
			{
				label: i18n.__('&Forward'),
				accelerator: process.platform === 'darwin' ? 'Command+Right' : 'Alt+Right',
				click: actions.server.goForward,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Tray icon'),
				type: 'checkbox',
				checked: state.trayIcon,
				click: actions.toggleTrayIcon,
			},
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('Full screen'),
					type: 'checkbox',
					checked: state.fullScreen,
					accelerator: 'Control+Command+F',
					click: actions.toggleFullScreen,
				},
			] : []),
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('Show window on unread messages'),
					type: 'checkbox',
					checked: state.showWindowOnUnreadChanged,
					click: actions.toggleShowWindowOnUnreadChanged,
				},
				{
					label: i18n.__('Menu bar'),
					type: 'checkbox',
					checked: state.menuBar,
					click: actions.toggleMenuBar,
				},
			] : []),
			{
				label: i18n.__('Server list'),
				type: 'checkbox',
				checked: state.serverList,
				click: actions.toggleServerList,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Reset zoom'),
				accelerator: 'CommandOrControl+0',
				role: 'resetzoom',
			},
			{
				label: i18n.__('Zoom in'),
				accelerator: 'CommandOrControl+Plus',
				role: 'zoomin',
			},
			{
				label: i18n.__('Zoom out'),
				accelerator: 'CommandOrControl+-',
				role: 'zoomout',
			},
		],
	},
	{
		label: i18n.__('&Window'),
		id: 'window',
		role: 'window',
		submenu: [
			...state.servers.map((host, i) => ({
				label: host.title.replace(/&/g, '&&'),
				type: state.currentServerUrl ? 'radio' : 'normal',
				checked: state.currentServerUrl === host.url,
				accelerator: `CommandOrControl+${ i + 1 }`,
				id: host.url,
				click: actions.selectServer(host),
			})),
			{
				type: 'separator',
			},
			{
				label: i18n.__('&Reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: actions.app.reload,
			},
			{
				label: i18n.__('Toggle &DevTools'),
				click: actions.app.toggleDevTools,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Minimize'),
				accelerator: 'CommandOrControl+M',
				role: 'minimize',
			},
			{
				label: i18n.__('Close'),
				accelerator: 'CommandOrControl+W',
				role: 'close',
			},
		],
	},
	{
		label: i18n.__('&Help'),
		role: 'help',
		submenu: [
			{
				label: i18n.__('Documentation'),
				click: actions.openUrl('https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Report issue'),
				click: actions.openUrl('https://github.com/RocketChat/Rocket.Chat/issues'),
			},
			{
				label: i18n.__('Reset app data'),
				click: actions.app.resetData,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Learn more'),
				click: actions.openUrl('https://rocket.chat'),
			},
			{
				label: i18n.__('About %s', state.appName),
				click: actions.about,
			},
		],
	},
]);

const actions = {
	quit() {
		app.quit();
	},

	about() {
		ipcRenderer.send('show-about-dialog');
	},

	openUrl: (url) => () => {
		shell.openExternal(url);
	},

	addNewServer() {
		getCurrentWindow().show();
		servers.clearActive();
		webview.showLanding();
	},

	selectServer: ({ url }) => () => {
		getCurrentWindow().show();
		servers.setActive(url);
	},

	server: {
		reload: ({ ignoringCache = false, clearCertificates = false } = {}) => () => {
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
		},

		openDevTools() {
			const activeWebview = webview.getActive();
			if (activeWebview) {
				activeWebview.openDevTools();
			}
		},

		goBack() {
			webview.goBack();
		},

		goForward() {
			webview.goForward();
		},
	},

	toggleTrayIcon() {
		tray.toggle();
		actions.update();
	},

	toggleFullScreen() {
		const mainWindow = getCurrentWindow();
		mainWindow.setFullScreen(!mainWindow.isFullScreen());
		actions.update();
	},

	toggleShowWindowOnUnreadChanged() {
		const previousValue = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
		const newValue = !previousValue;
		localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(newValue));
		actions.update();
	},

	toggleMenuBar() {
		const previousValue = localStorage.getItem('autohideMenu') !== 'true';
		const newValue = !previousValue;
		localStorage.setItem('autohideMenu', JSON.stringify(!newValue));
		actions.update();
	},

	toggleServerList() {
		sidebar.toggle();
		actions.update();
	},

	app: {
		reload() {
			const mainWindow = getCurrentWindow();
			if (mainWindow.destroyTray) {
				mainWindow.destroyTray();
			}
			mainWindow.removeAllListeners();
			mainWindow.reload();
		},

		toggleDevTools() {
			getCurrentWindow().toggleDevTools();
		},

		resetData() {
			servers.resetAppData();
		},
	},

	update() {
		const state = {
			appName: app.getName(),
			servers: Object.values(servers.hosts)
				.sort((a, b) => (sidebar ? (sidebar.sortOrder.indexOf(a.url) - sidebar.sortOrder.indexOf(b.url)) : 0))
				.map(({ title, url }) => ({ title, url })),
			currentServerUrl: servers.active,
			trayIcon: localStorage.getItem('hideTray') !== 'true',
			fullScreen: getCurrentWindow().isFullScreen(),
			showWindowOnUnreadChanged: localStorage.getItem('showWindowOnUnreadChanged') === 'true',
			menuBar: localStorage.getItem('autohideMenu') !== 'true',
			serverList: localStorage.getItem('sidebar-closed') !== 'true',
		};

		const menu = Menu.buildFromTemplate(createMenuTemplate(state, actions));
		Menu.setApplicationMenu(menu);

		if (process.platform !== 'darwin') {
			getCurrentWindow().setAutoHideMenuBar(!state.menuBar);
			getCurrentWindow().setMenuBarVisibility(state.menuBar);
		}
	},
};

servers.on('loaded', actions.update);
servers.on('active-cleared', actions.update);
servers.on('active-setted', actions.update);
servers.on('host-added', actions.update);
servers.on('host-removed', actions.update);
servers.on('title-setted', actions.update);

sidebar.on('hosts-sorted', actions.update);
sidebar.on('hide', actions.update);
sidebar.on('show', actions.update);

actions.update();
