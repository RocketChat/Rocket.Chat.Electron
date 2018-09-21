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
const isLinux = process.platform === 'linux';

const createMenuTemplate = () => ([
	{
		label: `&${ isMac ? app.getName() : i18n.__('File') }`,
		submenu: [
			...(isMac ? [
				{
					label: i18n.__('About', app.getName()),
					click: () => ipcRenderer.send('show-about-dialog'),
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
			// 	click: () => alert('Not implemented yet.'),
			// },
			{
				label: i18n.__('Add_new_server'),
				accelerator: 'CommandOrControl+N',
				click() {
					getCurrentWindow().show();
					servers.clearActive();
					webview.showLanding();
				},
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Quit_App', app.getName()),
				accelerator: 'CommandOrControl+Q',
				click: () => app.quit(),
			},
		],
	},
	{
		label: `&${ i18n.__('Edit') }`,
		submenu: [
			{
				label: i18n.__('Undo'),
				accelerator: 'CommandOrControl+Z',
				role: 'undo',
			},
			{
				label: i18n.__('Redo'),
				accelerator: isWindows ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				role: 'redo',
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Cut'),
				accelerator: 'CommandOrControl+X',
				role: 'cut',
			},
			{
				label: i18n.__('Copy'),
				accelerator: 'CommandOrControl+C',
				role: 'copy',
			},
			{
				label: i18n.__('Paste'),
				accelerator: 'CommandOrControl+V',
				role: 'paste',
			},
			{
				label: i18n.__('Select_All'),
				accelerator: 'CommandOrControl+A',
				role: 'selectall',
			},
		],
	},
	{
		label: `&${ i18n.__('View') }`,
		submenu: [
			{
				label: i18n.__('Current_Server_Reload'),
				accelerator: 'CommandOrControl+R',
				click() {
					const activeWebview = webview.getActive();
					if (activeWebview) {
						activeWebview.reload();
					}
				},
			},
			{
				label: i18n.__('Reload Ignoring Cache'),
				click() {
					const activeWebview = webview.getActive();
					if (activeWebview) {
						activeWebview.reloadIgnoringCache();
					}
				},
			},
			{
				label: i18n.__('Clear_Trusted_Certificates'),
				click: () => {
					certificate.clear();
					const activeWebview = webview.getActive();
					if (activeWebview) {
						activeWebview.reloadIgnoringCache();
					}
				},
			},
			{
				label: i18n.__('Current_Server_Toggle_DevTools'),
				accelerator: isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click() {
					const activeWebview = webview.getActive();
					if (activeWebview) {
						activeWebview.openDevTools();
					}
				},
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Back'),
				accelerator: isMac ? 'Command+Left' : 'Alt+Left',
				click: () => webview.goBack(),
			},
			{
				label: i18n.__('Forward'),
				accelerator: isMac ? 'Command+Right' : 'Alt+Right',
				click: () => webview.goForward(),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Toggle_Tray_Icon'),
				type: 'checkbox',
				checked: localStorage.getItem('hideTray') !== 'true',
				click: () => tray.toggle(),
			},
			...(isMac ? [
				{
					label: i18n.__('Toggle_Full_Screen'),
					type: 'checkbox',
					checked: getCurrentWindow().isFullScreen(),
					accelerator: 'Control+Command+F',
					click() {
						const mainWindow = getCurrentWindow();
						mainWindow.setFullScreen(!mainWindow.isFullScreen());
					},
				},
			] : []),
			...(!isMac ? [
				{
					label: i18n.__('Toggle_Menu_Bar'),
					type: 'checkbox',
					checked: localStorage.getItem('autohideMenu') === 'true',
					click() {
						const current = localStorage.getItem('autohideMenu') === 'true';
						getCurrentWindow().setAutoHideMenuBar(!current);
						localStorage.setItem('autohideMenu', JSON.stringify(!current));
					},
				},
			] : []),
			{
				label: i18n.__('Toggle_Server_List'),
				type: 'checkbox',
				checked: localStorage.getItem('sidebar-closed') !== 'true',
				click: () => sidebar.toggle(),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Original_Zoom'),
				accelerator: 'CommandOrControl+0',
				role: 'resetzoom',
			},
			{
				label: i18n.__('Zoom_In'),
				accelerator: 'CommandOrControl+Plus',
				role: 'zoomin',
			},
			{
				label: i18n.__('Zoom_Out'),
				accelerator: 'CommandOrControl+-',
				role: 'zoomout',
			},
		],
	},
	{
		label: `&${ i18n.__('Window') }`,
		id: 'window',
		role: 'window',
		submenu: [
			...(isMac ? [
				{
					label: i18n.__('Minimize'),
					accelerator: 'Command+M',
					role: 'minimize',
				},
				{
					label: i18n.__('Close'),
					accelerator: 'Command+W',
					role: 'close',
				},
				{
					type: 'separator',
				},
			] : []),
			...(Object.values(servers.hosts)
				.sort((a, b) => (sidebar ? (sidebar.sortOrder.indexOf(a.url) - sidebar.sortOrder.indexOf(b.url)) : 0))
				.map((host, i) => ({
					label: `&${ host.title }`,
					type: 'radio',
					checked: servers.active.url === host.url,
					accelerator: `CmdOrCtrl+${ i + 1 }`,
					id: host.url,
					click() {
						getCurrentWindow().show();
						servers.setActive(host.url);
					},
				}))
			),
			{
				type: 'separator',
			},
			{
				label: i18n.__('Application_Reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click() {
					const mainWindow = getCurrentWindow();
					if (mainWindow.destroyTray) {
						mainWindow.destroyTray();
					}
					mainWindow.reload();
				},
			},
			{
				label: i18n.__('Application_Toggle_DevTools'),
				click() {
					getCurrentWindow().toggleDevTools();
				},
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Close'),
				accelerator: 'CommandOrControl+W',
				click: () => getCurrentWindow().close(),
			},
		],
	},
	{
		label: `&${ i18n.__('Help') }`,
		role: 'help',
		submenu: [
			{
				label: i18n.__('Help_Name', app.getName()),
				click: () => shell.openExternal('https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Report_Issue'),
				click: () => shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues'),
			},
			{
				label: i18n.__('Reset_App_Data'),
				click: () => servers.resetAppData(),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Learn_More'),
				click: () => shell.openExternal('https://rocket.chat'),
			},
			{
				label: i18n.__('About', app.getName()),
				click: () => ipcRenderer.send('show-about-dialog'),
			},
		],
	},
]);

function updateMenus() {
	const menu = Menu.buildFromTemplate(createMenuTemplate());
	Menu.setApplicationMenu(menu);

	if (!isMac && localStorage.getItem('autohideMenu') === 'true') {
		getCurrentWindow().setAutoHideMenuBar(true);
	}
}

servers.on('host-added', updateMenus);
servers.on('host-removed', updateMenus);
servers.on('title-setted', updateMenus);
sidebar.on('hosts-sorted', updateMenus);
updateMenus();
