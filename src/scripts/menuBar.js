import { remote } from 'electron';
import i18next from 'i18next';
import { useEffect } from 'react';

import {
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_UNDO_CLICKED,
	MENU_BAR_REDO_CLICKED,
	MENU_BAR_CUT_CLICKED,
	MENU_BAR_COPY_CLICKED,
	MENU_BAR_PASTE_CLICKED,
	MENU_BAR_SELECT_ALL_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
} from './actions';

const createAppMenuItemTemplate = ({ appName, t, dispatch }) => ({
	label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
	submenu: [
		...process.platform === 'darwin' ? [
			{
				label: t('menus.about', { appName }),
				click: () => dispatch({ type: MENU_BAR_ABOUT_CLICKED }),
			},
			{ type: 'separator' },
			{
				label: t('menus.services'),
				role: 'services',
			},
			{ type: 'separator' },
			{
				label: t('menus.hide', { appName }),
				role: 'hide',
			},
			{
				label: t('menus.hideOthers'),
				role: 'hideothers',
			},
			{
				label: t('menus.unhide'),
				role: 'unhide',
			},
			{ type: 'separator' },
		] : [],
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'CommandOrControl+N',
				click: () => dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED }),
			},
		] : [],
		{ type: 'separator' },
		{
			label: t('menus.quit', { appName }),
			accelerator: 'CommandOrControl+Q',
			click: () => dispatch({ type: MENU_BAR_QUIT_CLICKED }),
		},
	],
});

const createEditMenuItemTemplate = ({ t, dispatch }) => ({
	label: t('menus.editMenu'),
	submenu: [
		{
			label: t('menus.undo'),
			accelerator: 'CommandOrControl+Z',
			click: () => dispatch({ type: MENU_BAR_UNDO_CLICKED }),
		},
		{
			label: t('menus.redo'),
			accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
			click: () => dispatch({ type: MENU_BAR_REDO_CLICKED }),
		},
		{ type: 'separator' },
		{
			label: t('menus.cut'),
			accelerator: 'CommandOrControl+X',
			click: () => dispatch({ type: MENU_BAR_CUT_CLICKED }),
		},
		{
			label: t('menus.copy'),
			accelerator: 'CommandOrControl+C',
			click: () => dispatch({ type: MENU_BAR_COPY_CLICKED }),
		},
		{
			label: t('menus.paste'),
			accelerator: 'CommandOrControl+V',
			click: () => dispatch({ type: MENU_BAR_PASTE_CLICKED }),
		},
		{
			label: t('menus.selectAll'),
			accelerator: 'CommandOrControl+A',
			click: () => dispatch({ type: MENU_BAR_SELECT_ALL_CLICKED }),
		},
	],
});

const createViewMenuItemTemplate = ({ showTrayIcon, showFullScreen, showMenuBar, showServerList, t, dispatch }) => ({
	label: t('menus.viewMenu'),
	submenu: [
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+R',
			click: () => dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED }),
		},
		{
			label: t('menus.reloadIgnoringCache'),
			click: () => dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED, payload: { ignoringCache: true } }),
		},
		{
			label: t('menus.clearTrustedCertificates'),
			click: () => dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED, payload: { ignoringCache: true, clearCertificates: true } }),
		},
		{
			label: t('menus.openDevTools'),
			accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
			click: () => dispatch({ type: MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED }),
		},
		{ type: 'separator' },
		{
			label: t('menus.back'),
			accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
			click: () => dispatch({ type: MENU_BAR_GO_BACK_CLICKED }),
		},
		{
			label: t('menus.forward'),
			accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
			click: () => dispatch({ type: MENU_BAR_GO_FORWARD_CLICKED }),
		},
		{ type: 'separator' },
		{
			label: t('menus.showTrayIcon'),
			type: 'checkbox',
			checked: showTrayIcon,
			click: () => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showTrayIcon' }),
		},
		...process.platform === 'darwin' ? [
			{
				label: t('menus.showFullScreen'),
				type: 'checkbox',
				checked: showFullScreen,
				accelerator: 'Control+Command+F',
				click: () => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showFullScreen' }),
			},
		] : [],
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.showMenuBar'),
				type: 'checkbox',
				checked: showMenuBar,
				click: () => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showMenuBar' }),
			},
		] : [],
		{
			label: t('menus.showServerList'),
			type: 'checkbox',
			checked: showServerList,
			click: () => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showServerList' }),
		},
		{ type: 'separator' },
		{
			label: t('menus.resetZoom'),
			accelerator: 'CommandOrControl+0',
			click: () => dispatch({ type: MENU_BAR_RESET_ZOOM_CLICKED }),
		},
		{
			label: t('menus.zoomIn'),
			accelerator: 'CommandOrControl+Plus',
			click: () => dispatch({ type: MENU_BAR_ZOOM_IN_CLICKED }),
		},
		{
			label: t('menus.zoomOut'),
			accelerator: 'CommandOrControl+-',
			click: () => dispatch({ type: MENU_BAR_ZOOM_OUT_CLICKED }),
		},
	],
});

const createWindowMenuItemTemplate = ({ servers, currentServerUrl, showWindowOnUnreadChanged, t, dispatch }) => ({
	label: t('menus.windowMenu'),
	role: 'window',
	submenu: [
		...process.platform === 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'CommandOrControl+N',
				click: () => dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED }),
			},
			{ type: 'separator' },
		] : [],
		...servers.map((server, i) => ({
			type: currentServerUrl ? 'radio' : 'normal',
			label: server.title.replace(/&/g, '&&'),
			checked: currentServerUrl === server.url,
			accelerator: `CommandOrControl+${ i + 1 }`,
			click: () => dispatch({ type: MENU_BAR_SELECT_SERVER_CLICKED, payload: server }),
		})),
		{ type: 'separator' },
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+Shift+R',
			click: () => dispatch({ type: MENU_BAR_RELOAD_APP_CLICKED }),
		},
		{
			label: t('menus.toggleDevTools'),
			click: () => dispatch({ type: MENU_BAR_TOGGLE_DEVTOOLS_CLICKED }),
		},
		{ type: 'separator' },
		{
			type: 'checkbox',
			label: t('menus.showOnUnreadMessage'),
			checked: showWindowOnUnreadChanged,
			click: () => dispatch({ type: MENU_BAR_TOGGLE_SETTING_CLICKED, payload: 'showWindowOnUnreadChanged' }),
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
	],
});

const createHelpMenuItemTemplate = ({ appName, t, dispatch }) => ({
	label: t('menus.helpMenu'),
	role: 'help',
	submenu: [
		{
			label: t('menus.documentation'),
			click: () => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://rocket.chat/docs' }),
		},
		{ type: 'separator' },
		{
			label: t('menus.reportIssue'),
			click: () => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new' }),
		},
		{
			label: t('menus.resetAppData'),
			click: () => dispatch({ type: MENU_BAR_RESET_APP_DATA_CLICKED }),
		},
		{ type: 'separator' },
		{
			label: t('menus.learnMore'),
			click: () => dispatch({ type: MENU_BAR_OPEN_URL_CLICKED, payload: 'https://rocket.chat' }),
		},
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.about', { appName }),
				click: () => dispatch({ type: MENU_BAR_ABOUT_CLICKED }),
			},
		] : [],
	],
});

export function MenuBar({
	appName = remote.app.name,
	showFullScreen,
	showServerList,
	showTrayIcon,
	showMenuBar,
	servers = [],
	currentServerUrl,
	showWindowOnUnreadChanged,
	dispatch,
}) {
	const t = ::i18next.t;

	useEffect(() => {
		const template = [
			createAppMenuItemTemplate({ t, appName, dispatch }),
			createEditMenuItemTemplate({ t, dispatch }),
			createViewMenuItemTemplate({ showTrayIcon, showFullScreen, showMenuBar, showServerList, t, dispatch }),
			createWindowMenuItemTemplate({ servers, currentServerUrl, showWindowOnUnreadChanged, t, dispatch }),
			createHelpMenuItemTemplate({ appName, t, dispatch }),
		];

		const menu = remote.Menu.buildFromTemplate(template);

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
		dispatch,
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
