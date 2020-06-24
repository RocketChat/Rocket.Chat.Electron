import { EventEmitter } from 'events';

import { remote } from 'electron';
import { t } from 'i18next';

const { app, Menu, webContents } = remote;

const createTemplate = ({
	appName,
	servers = [],
	currentServerUrl = null,
	showTrayIcon = true,
	showFullScreen = false,
	showMenuBar = true,
	showServerList = true,
	showWindowOnUnreadChanged = false,
}, events) => [
	{
		label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
		submenu: [
			...process.platform === 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => events.emit('about'),
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
			] : [],
			// ...process.platform !== 'darwin' ? [
			// 	{
			// 		label: t('menus.addNewServer'),
			// 		accelerator: 'CommandOrControl+N',
			// 		click: () => events.emit('add-new-server'),
			// 	},
			// ] : [],
			// {
			// 	type: 'separator',
			// },
			{
				label: t('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => events.emit('quit'),
			},
		],
	},
	{
		label: t('menus.editMenu'),
		submenu: [
			{
				label: t('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				click: () => webContents.getFocusedWebContents().undo(),
			},
			{
				label: t('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				click: () => webContents.getFocusedWebContents().redo(),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.cut'),
				accelerator: 'CommandOrControl+X',
				role: 'cut',
			},
			{
				label: t('menus.copy'),
				accelerator: 'CommandOrControl+C',
				role: 'copy',
			},
			{
				label: t('menus.paste'),
				accelerator: 'CommandOrControl+V',
				role: 'paste',
			},
			{
				label: t('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				role: 'selectall',
			},
		],
	},
	{
		label: t('menus.viewMenu'),
		submenu: [
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => events.emit('reload-server'),
			},
			// {
			// 	label: t('menus.reloadIgnoringCache'),
			// 	click: () => events.emit('reload-server', { ignoringCache: true }),
			// },
			{
				label: t('menus.clearTrustedCertificates'),
				click: () => events.emit('reload-server', { ignoringCache: true, clearCertificates: true }),
			},
			// {
			// 	label: t('menus.openDevTools'),
			// 	accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
			// 	click: () => events.emit('open-devtools-for-server'),
			// },
			{
				type: 'separator',
			},
			{
				label: t('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				click: () => events.emit('go-back'),
			},
			{
				label: t('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				click: () => events.emit('go-forward'),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.showTrayIcon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: () => events.emit('toggle', 'showTrayIcon'),
			},
			...process.platform === 'darwin' ? [
				{
					label: t('menus.showFullScreen'),
					type: 'checkbox',
					checked: showFullScreen,
					accelerator: 'Control+Command+F',
					click: () => events.emit('toggle', 'showFullScreen'),
				},
			] : [
				{
					label: t('menus.showMenuBar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: () => events.emit('toggle', 'showMenuBar'),
				},
			],
			// {
			// 	label: t('menus.showServerList'),
			// 	type: 'checkbox',
			// 	checked: showServerList,
			// 	click: () => events.emit('toggle', 'showServerList'),
			// },
			{
				type: 'separator',
			},
			{
				label: t('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				role: 'resetzoom',
			},
			{
				label: t('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				role: 'zoomin',
			},
			{
				label: t('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				role: 'zoomout',
			},
		],
	},
	{
		label: t('menus.windowMenu'),
		role: 'window',
		submenu: [
			...process.platform === 'darwin' ? [
				{
					label: t('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
				{
					type: 'separator',
				},
			] : [],
			...servers.map((host, i) => ({
				label: host.title.replace(/&/g, '&&'),
				type: currentServerUrl ? 'radio' : 'normal',
				checked: currentServerUrl === host.url,
				accelerator: `CommandOrControl+${ i + 1 }`,
				id: host.url,
				click: () => events.emit('select-server', host),
			})),
			{
				type: 'separator',
			},
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => events.emit('reload-app'),
			},
			// {
			// 	label: t('menus.toggleDevTools'),
			// 	click: () => events.emit('toggle-devtools'),
			// },
			{
				type: 'separator',
			},
			{
				label: t('menus.showOnUnreadMessage'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: () => events.emit('toggle', 'showWindowOnUnreadChanged'),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.minimize'),
				accelerator: 'CommandOrControl+M',
				role: 'minimize',
			},
			{
				label: t('menus.close'),
				accelerator: 'CommandOrControl+W',
				role: 'close',
			},
		],
	},
	{
		label: t('menus.helpMenu'),
		role: 'help',
		submenu: [
			// {
			// 	label: t('menus.documentation'),
			// 	click: () => events.emit('open-url', 'https://rocket.chat/docs'),
			// },
			// {
			// 	type: 'separator',
			// },
			// {
			// 	label: t('menus.reportIssue'),
			// 	click: () => events.emit('open-url', 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new'),
			// },
			{
				label: t('menus.resetAppData'),
				click: () => events.emit('reset-app-data'),
			},
			// {
			// 	type: 'separator',
			// },
			// {
			// 	label: t('menus.learnMore'),
			// 	click: () => events.emit('open-url', 'https://rocket.chat'),
			// },
			...process.platform !== 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => events.emit('about'),
				},
			] : [],
		],
	},
];

class Menus extends EventEmitter {
	constructor() {
		super();
		this.state = {};
	}

	setState(partialState) {
		this.state = {
			...this.state,
			...partialState,
		};
		this.update();
	}

	getItem(id) {
		return Menu.getApplicationMenu().getMenuItemById(id);
	}

	update() {
		const template = createTemplate({ appName: app.name, ...this.state }, this);
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);

		if (process.platform !== 'darwin') {
			const { showMenuBar } = this.state;
			const mainWindow = remote.getCurrentWindow();
			mainWindow.autoHideMenuBar = !showMenuBar;
			mainWindow.setMenuBarVisibility(!!showMenuBar);
		}

		this.emit('update');
	}
}

export default new Menus();
