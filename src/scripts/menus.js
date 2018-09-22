import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n/index.js';
import webview from './webview';
import sidebar from './sidebar';
import tray from './tray';
import servers from './servers';

const { app, getCurrentWindow, shell, Menu } = remote;
const { certificate } = remote.require('./background');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

const getMainWindow = getCurrentWindow;

const actions = {
	quit() {
		app.quit();
	},

	about() {
		ipcRenderer.send('show-about-dialog');
	},

	addNewServer() {
		getMainWindow().show();
		servers.clearActive();
		webview.showLanding();
	},

	selectServer: (host) => () => {
		getMainWindow().show();
		servers.setActive(host.url);
	},

	server: {
		reload() {
			const activeWebview = webview.getActive();
			if (activeWebview) {
				activeWebview.reload();
			}
		},

		reloadIgnoringCache() {
			const activeWebview = webview.getActive();
			if (activeWebview) {
				activeWebview.reload();
			}
		},

		clearCertificatesAndReload() {
			certificate.clear();
			const activeWebview = webview.getActive();
			if (activeWebview) {
				activeWebview.reload();
			}
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
	},

	toggleFullScreen() {
		const mainWindow = getMainWindow();
		mainWindow.setFullScreen(!mainWindow.isFullScreen());
	},

	toggleMenuBar() {
		const current = localStorage.getItem('autohideMenu') === 'true';
		getMainWindow().setAutoHideMenuBar(!current);
		localStorage.setItem('autohideMenu', JSON.stringify(!current));
	},

	toggleServerList() {
		sidebar.toggle();
	},

	app: {
		reload() {
			const mainWindow = getMainWindow();
			console.log({ mainWindow });
			if (mainWindow.destroyTray) {
				mainWindow.destroyTray();
			}
			mainWindow.reload();
		},

		toggleDevTools() {
			getMainWindow().toggleDevTools();
		},

		resetData() {
			servers.resetAppData();
		},
	},
};

const createMenuTemplate = (state) => ([
	{
		label: isMac ? app.getName() : i18n.__('&File'),
		submenu: [
			...(isMac ? [
				{
					label: i18n.__('About %s', app.getName()),
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
				label: i18n.__('&Quit %s', app.getName()),
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
				accelerator: isWindows ? 'Control+Y' : 'CommandOrControl+Shift+Z',
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
				click: actions.server.reload,
			},
			{
				label: i18n.__('Reload ignoring cache'),
				click: actions.server.reloadIgnoringCache,
			},
			{
				label: i18n.__('Clear trusted certificates'),
				click: actions.server.clearCertificatesAndReload,
			},
			{
				label: i18n.__('Open &DevTools'),
				accelerator: isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: actions.server.openDevTools,
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('&Back'),
				accelerator: isMac ? 'Command+Left' : 'Alt+Left',
				click: actions.server.goBack,
			},
			{
				label: i18n.__('&Forward'),
				accelerator: isMac ? 'Command+Right' : 'Alt+Right',
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
			...(isMac ? [
				{
					label: i18n.__('Full screen'),
					type: 'checkbox',
					checked: state.fullScreen,
					accelerator: 'Control+Command+F',
					click: actions.toggleFullScreen,
				},
			] : []),
			...(!isMac ? [
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
				click: () => shell.openExternal('https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Report issue'),
				click: () => shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues'),
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
				click: () => shell.openExternal('https://rocket.chat'),
			},
			{
				label: i18n.__('About %s', app.getName()),
				click: actions.about,
			},
		],
	},
]);

function updateMenus() {
	const state = {};
	state.trayIcon = localStorage.getItem('hideTray') !== 'true';
	state.fullScreen = getMainWindow().isFullScreen();
	state.menuBar = localStorage.getItem('autohideMenu') !== 'true';
	state.serverList = localStorage.getItem('sidebar-closed') !== 'true';

	state.servers = Object.values(servers.hosts)
		.sort((a, b) => (sidebar ? (sidebar.sortOrder.indexOf(a.url) - sidebar.sortOrder.indexOf(b.url)) : 0))
		.map(({ title, url }) => ({ title, url }));
	state.currentServerUrl = servers.active;

	const menu = Menu.buildFromTemplate(createMenuTemplate(state));
	Menu.setApplicationMenu(menu);

	if (!isMac && localStorage.getItem('autohideMenu') === 'true') {
		getMainWindow().setAutoHideMenuBar(true);
	}
}

servers.on('loaded', updateMenus);
servers.on('active-cleared', updateMenus);
servers.on('active-setted', updateMenus);
servers.on('host-added', updateMenus);
servers.on('host-removed', updateMenus);
servers.on('title-setted', updateMenus);

sidebar.on('hosts-sorted', updateMenus);
sidebar.on('hide', updateMenus);
sidebar.on('show', updateMenus);

updateMenus();
