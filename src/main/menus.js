import { app, Menu } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n';


const createTemplate = ({
	appName,
	servers = [],
	currentServerUrl = null,
	showTrayIcon = true,
	showFullScreen = false,
	showMenuBar = true,
	showServerList = true,
	showWindowOnUnreadChanged = false,
}, events) => ([
	{
		label: process.platform === 'darwin' ? appName : i18n.__('menus.fileMenu'),
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					id: 'about',
					label: i18n.__('menus.about', { appName }),
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
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
			] : []),
			{
				type: 'separator',
			},
			{
				id: 'quit',
				label: i18n.__('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => events.emit('quit'),
			},
		],
	},
	{
		label: i18n.__('menus.editMenu'),
		submenu: [
			{
				label: i18n.__('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				role: 'undo',
			},
			{
				label: i18n.__('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				role: 'redo',
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.cut'),
				accelerator: 'CommandOrControl+X',
				role: 'cut',
			},
			{
				label: i18n.__('menus.copy'),
				accelerator: 'CommandOrControl+C',
				role: 'copy',
			},
			{
				label: i18n.__('menus.paste'),
				accelerator: 'CommandOrControl+V',
				role: 'paste',
			},
			{
				label: i18n.__('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				role: 'selectall',
			},
		],
	},
	{
		label: i18n.__('menus.viewMenu'),
		submenu: [
			{
				label: i18n.__('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => events.emit('reload-server'),
			},
			{
				label: i18n.__('menus.reloadIgnoringCache'),
				click: () => events.emit('reload-server', { ignoringCache: true }),
			},
			{
				label: i18n.__('menus.clearTrustedCertificates'),
				click: () => events.emit('reload-server', { ignoringCache: true, clearCertificates: true }),
			},
			{
				label: i18n.__('menus.openDevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => events.emit('open-devtools-for-server'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				click: () => events.emit('go-back'),
			},
			{
				label: i18n.__('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				click: () => events.emit('go-forward'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.showTrayIcon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: () => events.emit('toggle', 'showTrayIcon'),
			},
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('menus.showFullScreen'),
					type: 'checkbox',
					checked: showFullScreen,
					accelerator: 'Control+Command+F',
					click: () => events.emit('toggle', 'showFullScreen'),
				},
			] : [
				{
					label: i18n.__('menus.showMenuBar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: () => events.emit('toggle', 'showMenuBar'),
				},
			]),
			{
				label: i18n.__('menus.showServerList'),
				type: 'checkbox',
				checked: showServerList,
				click: () => events.emit('toggle', 'showServerList'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				role: 'resetzoom',
			},
			{
				label: i18n.__('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				role: 'zoomin',
			},
			{
				label: i18n.__('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				role: 'zoomout',
			},
		],
	},
	{
		label: i18n.__('menus.windowMenu'),
		id: 'window',
		role: 'window',
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('menus.addNewServer'),
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
				label: i18n.__('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => events.emit('reload-app'),
			},
			{
				label: i18n.__('menus.toggleDevTools'),
				click: () => events.emit('toggle-devtools'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.showOnUnreadMessage'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: () => events.emit('toggle', 'showWindowOnUnreadChanged'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.minimize'),
				accelerator: 'CommandOrControl+M',
				role: 'minimize',
			},
			{
				label: i18n.__('menus.close'),
				accelerator: 'CommandOrControl+W',
				role: 'close',
			},
		],
	},
	{
		label: i18n.__('menus.helpMenu'),
		role: 'help',
		submenu: [
			{
				label: i18n.__('menus.documentation'),
				click: () => events.emit('open-url', 'https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.reportIssue'),
				click: () => events.emit('open-url', 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new'),
			},
			{
				label: i18n.__('menus.resetAppData'),
				click: () => events.emit('reset-app-data'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.learnMore'),
				click: () => events.emit('open-url', 'https://rocket.chat'),
			},
			...(process.platform !== 'darwin' ? [
				{
					id: 'about',
					label: i18n.__('menus.about', { appName }),
					click: () => events.emit('about'),
				},
			] : []),
		],
	},
]);

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

		this.emit('update');
	}
}

const unsetDefaultApplicationMenu = () => {
	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		label: app.getName(),
		submenu: [
			{
				label: i18n.__('menus.quit', { appName: app.getName() }),
				accelerator: 'CommandOrControl+Q',
				click() {
					app.quit();
				},
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

app.once('start', unsetDefaultApplicationMenu);

export default new Menus();
