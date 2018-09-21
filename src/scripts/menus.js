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

const windowMenu = [
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
	{
		type: 'separator',
		id: 'server-list-separator',
		visible: false,
	},
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
		label: i18n.__('Bring_All_to_Front'),
		click: () => getCurrentWindow().show(),
	},
	...((isWindows || isLinux) ? [
		{
			type: 'separator',
		},
		{
			label: i18n.__('Close'),
			accelerator: 'CommandOrControl+W',
			click: () => getCurrentWindow().close(),
		},
	] : []),
];

const menuTemplate = [
	{
		label: `&${ app.getName() }`,
		submenu: [
			{
				label: i18n.__('About', app.getName()),
				click: () => ipcRenderer.send('show-about-dialog'),
			},
			...(isMac ? [
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
			] : []),
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
				accelerator: 'CommandOrControl+Shift+Z',
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
			{
				type: 'separator',
			},
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
			...(isMac ? [
				{
					label: i18n.__('Toggle_Tray_Icon'),
					click: () => tray.toggle(),
				}, {
					label: i18n.__('Toggle_Full_Screen'),
					accelerator: 'Control+Command+F',
					click() {
						const mainWindow = getCurrentWindow();
						mainWindow.setFullScreen(!mainWindow.isFullScreen());
					},
				},
			] : []),
			...((isWindows || isLinux) ? [
				{
					label: i18n.__('Toggle_Menu_Bar'),
					click() {
						const current = localStorage.getItem('autohideMenu') === 'true';
						getCurrentWindow().setAutoHideMenuBar(!current);
						localStorage.setItem('autohideMenu', JSON.stringify(!current));
					},
				},
			] : []),
			{
				label: i18n.__('Toggle_Server_List'),
				click: () => sidebar.toggle(),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Clear'),
				submenu: [
					{
						label: i18n.__('Clear_Trusted_Certificates'),
						click: () => certificate.clear(),
					},
				],
			},
		],
	},
	{
		label: `&${ i18n.__('History') }`,
		submenu: [
			{
				label: i18n.__('Back'),
				accelerator: isMac ? 'Command+left' : 'Alt+Left',
				click: () => webview.goBack(),
			},
			{
				label: i18n.__('Forward'),
				accelerator: isMac ? 'Command+right' : 'Alt+Right',
				click: () => webview.goForward(),
			},
		],
	},
	{
		label: `&${ i18n.__('Window') }`,
		id: 'window',
		role: 'window',
		submenu: windowMenu,
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
		],
	},
];

function createMenu() {
	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);

	if (!isMac && localStorage.getItem('autohideMenu') === 'true') {
		getCurrentWindow().setAutoHideMenuBar(true);
	}
}

function addServer(host, position) {
	const index = windowMenu.findIndex((i) => i.id === 'server-list-separator');
	windowMenu[index].visible = true;

	const menuItem = {
		label: `&${ host.title }`,
		accelerator: `CommandOrControl+${ position }`,
		position: 'before=server-list-separator',
		id: host.url,
		click() {
			getCurrentWindow().show();
			servers.setActive(host.url);
		},
	};

	windowMenu.push(menuItem);
	createMenu();
}

function removeServer(server) {
	const index = windowMenu.findIndex((i) => i.id === server);
	windowMenu.splice(index, 1);
	createMenu();
}

createMenu();

export {
	addServer,
	removeServer,
};
