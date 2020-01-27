import { remote } from 'electron';
import { t } from 'i18next';
import { createElement, useEffect, useRef, useState } from './reactiveUi';

const createMenu = ({
	appName = remote.app.name,
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	servers = [],
	currentServerUrl,
	showWindowOnUnreadChanged,
	onAction,
}) => {
	const template = [
		{
			label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
			submenu: [
				...process.platform === 'darwin' ? [
					{
						label: t('menus.about', { appName }),
						click: () => onAction({ type: 'about' })
					},
					{ type: 'separator' },
					{ role: 'services' },
					{ type: 'separator' },
					{ role: 'hide' },
					{ role: 'hideothers' },
					{ role: 'unhide' },
					{ type: 'separator' },
				] : [],
				...process.platform !== 'darwin' ? [
					{
						label: t('menus.addNewServer'),
						accelerator: 'CommandOrControl+N',
						click: () => onAction({ type: 'add-new-server' })
					},
				] : [],
				{ type: 'separator' },
				{
					label: t('menus.quit', { appName }),
					accelerator: 'CommandOrControl+Q',
					click: () => onAction({ type: 'quit' })
				},
			]
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
				{ type: 'separator' },
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
			]
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
				{ type: 'separator' },
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
				{ type: 'separator' },
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
				] : [],
				...process.platform !== 'darwin' ? [
					{
						label: t('menus.showMenuBar'),
						type: 'checkbox',
						checked: showMenuBar,
						click: () => onAction({ type: 'toggle', payload: 'showMenuBar' }),
					},
				] : [],
				{
					label: t('menus.showServerList'),
					type: 'checkbox',
					checked: showServerList,
					click: () => onAction({ type: 'toggle', payload: 'showServerList' }),
				},
				{ type: 'separator' },
				{
					label: t('menus.resetZoom'),
					accelerator: 'CommandOrControl+0',
					click: () => onAction({ type: 'reset-zoom' }),
				},
				{
					label: t('menus.zoomIn'),
					accelerator: 'CommandOrControl+Plus',
					click: () => onAction({ type: 'zoom-in' }),
				},
				{
					label: t('menus.zoomOut'),
					accelerator: 'CommandOrControl+-',
					click: () => onAction({ type: 'zoom-out' }),
				},
			]
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
					{ type: 'separator' },
				] : [],
				...servers.map((server, i) => ({
					type: currentServerUrl ? 'radio' : 'normal',
					label: server.title.replace(/&/g, '&&'),
					checked: currentServerUrl === server.url,
					accelerator: `CommandOrControl+${ i + 1 }`,
					click: () => onAction({ type: 'select-server', payload: server }),
				})),
				{ type: 'separator' },
				{
					label: t('menus.reload'),
					accelerator: 'CommandOrControl+Shift+R',
					click: () => onAction({ type: 'reload-app' }),
				},
				{
					label: t('menus.toggleDevTools'),
					click: () => onAction({ type: 'toggle-devtools' }),
				},
				{ type: 'separator' },
				{
					type: 'checkbox',
					label: t('menus.showOnUnreadMessage'),
					checked: showWindowOnUnreadChanged,
					click: () => onAction({ type: 'toggle', payload: 'showWindowOnUnreadChanged' }),
				},
				{ type: 'separator' },
				{
					role: 'minimize',
					label: t('menus.minimize'),
					accelerator: 'CommandOrControl+M',
				},
				{
					role: 'close',
					label: t('menus.close'),
					accelerator: 'CommandOrControl+W',
				},
			]
		},
		{
			label: t('menus.helpMenu'),
			role: 'help',
			submenu: [
				{
					label: t('menus.documentation'),
					click: () => onAction({ type: 'open-url', payload: 'https://rocket.chat/docs' }),
				},
				{ type: 'separator' },
				{
					label: t('menus.reportIssue'),
					click: () => onAction({ type: 'open-url', payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' }),
				},
				{
					label: t('menus.resetAppData'),
					click: () => onAction({ type: 'reset-app-data' }),
				},
				{ type: 'separator' },
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
			]
		},
	];

	const menu = remote.Menu.buildFromTemplate(template);

	return menu;
};

function MenuBar({
	appName = remote.app.name,
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	servers = [],
	currentServerUrl,
	showWindowOnUnreadChanged,
	onAction,
}) {
	useEffect(() => {
		const menu = createMenu({
			appName,
			showFullScreen,
			showServerList,
			showTrayIcon,
			showMenuBar,
			servers,
			currentServerUrl,
			showWindowOnUnreadChanged,
			onAction,
		});
		remote.Menu.setApplicationMenu(menu);

		return () => {
			remote.Menu.setApplicationMenu(null);
		};
	}, [
		appName,
		showFullScreen,
		showServerList,
		showTrayIcon,
		showMenuBar,
		servers,
		currentServerUrl,
		showWindowOnUnreadChanged,
		onAction,
	]);

	useEffect(() => {
		if (process.platform === 'darwin') {
			return;
		}

		remote.getCurrentWindow().autoHideMenuBar = !showMenuBar;
		remote.getCurrentWindow().setMenuBarVisibility(!!showMenuBar);
	}, [showMenuBar]);

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
