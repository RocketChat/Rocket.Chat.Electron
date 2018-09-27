import { app, Menu } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';

const createTemplate = ({
	appName,
	servers = [],
	currentServerUrl = null,
	showTrayIcon = true,
	showUserStatusInTray = true,
	showFullScreen = false,
	showMenuBar = true,
	showServerList = true,
	showWindowOnUnreadChanged = false,
}, events) => ([
	{
		label: process.platform === 'darwin' ? appName : i18n.__('&File'),
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('About %s', appName),
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
			] : []),
			// {
			// 	label: i18n.__('Preferences'),
			// 	accelerator: 'CommandOrControl+,',
			// 	click: () => events.emit('preferences'),
			// },
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('Add &new server'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
			] : []),
			{
				type: 'separator',
			},
			{
				id: 'quit',
				label: i18n.__('&Quit %s', appName),
				accelerator: 'CommandOrControl+Q',
				click: () => events.emit('quit'),
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
				click: () => events.emit('reload-server'),
			},
			{
				label: i18n.__('Reload ignoring cache'),
				click: () => events.emit('reload-server', { ignoringCache: true }),
			},
			{
				label: i18n.__('Clear trusted certificates'),
				click: () => events.emit('reload-server', { ignoringCache: true, clearCertificates: true }),
			},
			{
				label: i18n.__('Open &DevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => events.emit('open-devtools-for-server'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('&Back'),
				accelerator: process.platform === 'darwin' ? 'Command+Left' : 'Alt+Left',
				click: () => events.emit('go-back'),
			},
			{
				label: i18n.__('&Forward'),
				accelerator: process.platform === 'darwin' ? 'Command+Right' : 'Alt+Right',
				click: () => events.emit('go-forward'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Tray icon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: () => events.emit('toggle', 'showTrayIcon'),
			},
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('User status in tray'),
					type: 'checkbox',
					enabled: showTrayIcon,
					checked: showTrayIcon && showUserStatusInTray,
					click: () => events.emit('toggle', 'showUserStatusInTray'),
				},
				{
					label: i18n.__('Full screen'),
					type: 'checkbox',
					checked: showFullScreen,
					accelerator: 'Control+Command+F',
					click: () => events.emit('toggle', 'showFullScreen'),
				},
			] : []),
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('Menu bar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: () => events.emit('toggle', 'showMenuBar'),
				},
			] : []),
			{
				label: i18n.__('Server list'),
				type: 'checkbox',
				checked: showServerList,
				click: () => events.emit('toggle', 'showServerList'),
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
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('Add &new server'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
				{
					type: 'separator',
				},
			] : []),
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
				label: i18n.__('&Reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => events.emit('reload-app'),
			},
			{
				label: i18n.__('Toggle &DevTools'),
				click: () => events.emit('toggle-devtools'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Show on unread messages'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: () => events.emit('toggle', 'showWindowOnUnreadChanged'),
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
				click: () => events.emit('open-url', 'https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Report issue'),
				click: () => events.emit('open-url', 'https://github.com/RocketChat/Rocket.Chat/issues'),
			},
			{
				label: i18n.__('Reset app data'),
				click: () => events.emit('reset-app-data'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('Learn more'),
				click: () => events.emit('open-url', 'https://rocket.chat'),
			},
			{
				id: 'about',
				label: i18n.__('About %s', appName),
				click: () => events.emit('about'),
			},
		],
	},
]);

class Menus extends EventEmitter {
	constructor() {
		super();
		this.state = {};
		this.on('update', this.update.bind(this));
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

	async update() {
		const template = createTemplate({ appName: app.getName(), ...this.state }, this);
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);

		if (process.platform !== 'darwin') {
			const { showMenuBar } = this.state;
			const mainWindow = await getMainWindow();
			mainWindow.setAutoHideMenuBar(!showMenuBar);
			mainWindow.setMenuBarVisibility(!!showMenuBar);
		}
	}
}

export default new Menus();
