import { remote } from 'electron';
import { t } from 'i18next';
import { createElement, useEffect } from './reactiveUi';

const createTemplate = ({
	appName,
	servers = [],
	currentServerUrl = null,
	showTrayIcon = true,
	showFullScreen = false,
	showMenuBar = true,
	showServerList = true,
	showWindowOnUnreadChanged = false,
	onAction,
}) => [
	{
		label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
		submenu: [
			...process.platform === 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => onAction({ type: 'about' }),
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
			...process.platform !== 'darwin' ? [
				{
					label: t('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => onAction({ type: 'add-new-server' }),
				},
			] : [],
			{
				type: 'separator',
			},
			{
				label: t('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => onAction({ type: 'quit' }),
			},
		],
	},
	{
		label: t('menus.editMenu'),
		submenu: [
			{
				label: t('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				click: () => onAction({ type: 'undo' }),
			},
			{
				label: t('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				click: () => onAction({ type: 'redo' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.cut'),
				accelerator: 'CommandOrControl+X',
				click: () => onAction({ type: 'cut' }),
			},
			{
				label: t('menus.copy'),
				accelerator: 'CommandOrControl+C',
				click: () => onAction({ type: 'copy' }),
			},
			{
				label: t('menus.paste'),
				accelerator: 'CommandOrControl+V',
				click: () => onAction({ type: 'paste' }),
			},
			{
				label: t('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				click: () => onAction({ type: 'select-all' }),
			},
		],
	},
	{
		label: t('menus.viewMenu'),
		submenu: [
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => onAction({ type: 'reload-server' }),
			},
			{
				label: t('menus.reloadIgnoringCache'),
				click: () => onAction({ type: 'reload-server', payload: { ignoringCache: true } }),
			},
			{
				label: t('menus.clearTrustedCertificates'),
				click: () => onAction({ type: 'reload-server', payload: { ignoringCache: true, clearCertificates: true } }),
			},
			{
				label: t('menus.openDevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => onAction({ type: 'open-devtools-for-server' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				click: () => onAction({ type: 'go-back' }),
			},
			{
				label: t('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				click: () => onAction({ type: 'go-forward' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.showTrayIcon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: () => onAction({ type: 'toggle', payload: 'showTrayIcon' }),
			},
			...process.platform === 'darwin' ? [
				{
					label: t('menus.showFullScreen'),
					type: 'checkbox',
					checked: showFullScreen,
					accelerator: 'Control+Command+F',
					click: () => onAction({ type: 'toggle', payload: 'showFullScreen' }),
				},
			] : [
				{
					label: t('menus.showMenuBar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: () => onAction({ type: 'toggle', payload: 'showMenuBar' }),
				},
			],
			{
				label: t('menus.showServerList'),
				type: 'checkbox',
				checked: showServerList,
				click: () => onAction({ type: 'toggle', payload: 'showServerList' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				click: () => {
					remote.webContents.getFocusedWebContents().zoomLevel = 0;
				},
			},
			{
				label: t('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				click: () => {
					remote.webContents.getFocusedWebContents().zoomLevel++;
				},
			},
			{
				label: t('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				click: () => {
					remote.webContents.getFocusedWebContents().zoomLevel--;
				},
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
					click: () => onAction({ type: 'add-new-server' }),
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
				click: () => onAction({ type: 'select-server', payload: host }),
			})),
			{
				type: 'separator',
			},
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => onAction({ type: 'reload-app' }),
			},
			{
				label: t('menus.toggleDevTools'),
				click: () => onAction({ type: 'toggle-devtools' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.showOnUnreadMessage'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: () => onAction({ type: 'toggle', payload: 'showWindowOnUnreadChanged' }),
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
			{
				label: t('menus.documentation'),
				click: () => onAction({ type: 'open-url', payload: 'https://rocket.chat/docs' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.reportIssue'),
				click: () => onAction({ type: 'open-url', payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' }),
			},
			{
				label: t('menus.resetAppData'),
				click: () => onAction({ type: 'reset-app-data' }),
			},
			{
				type: 'separator',
			},
			{
				label: t('menus.learnMore'),
				click: () => onAction({ type: 'open-url', payload: 'https://rocket.chat' }),
			},
			...process.platform !== 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => onAction({ type: 'about' }),
				},
			] : [],
		],
	},
];

function MenuBar(props) {
	useEffect(()=> {
		const template = createTemplate({ appName: remote.app.name, ...props });
		const menu = remote.Menu.buildFromTemplate(template);
		remote.Menu.setApplicationMenu(menu);

		if (process.platform !== 'darwin') {
			const { showMenuBar } = props;
			const mainWindow = remote.getCurrentWindow();
			mainWindow.autoHideMenuBar = !showMenuBar;
			mainWindow.setMenuBarVisibility(!!showMenuBar);
		}
	});

	return null;
}

let menuBarElement;

export const mountMenuBar = (props) => {
	menuBarElement = createElement(MenuBar, props);
	menuBarElement.mount(document.body);
};

export const updateMenuBar = (newProps) => {
	menuBarElement.update(newProps);
};
