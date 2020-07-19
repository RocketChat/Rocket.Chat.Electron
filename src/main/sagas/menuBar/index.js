import { Menu, app } from 'electron';
import { t } from 'i18next';
import { takeEvery, fork, getContext } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
} from '../../../actions';
import { storeChangeChannel } from '../../channels';
import {
	selectAppName,
	selectCanCopy,
	selectCanCut,
	selectCanPaste,
	selectCanRedo,
	selectCanSelectAll,
	selectCanUndo,
	selectCurrentServerUrl,
	selectFocusedWebContents,
	selectIsFullScreenEnabled,
	selectIsMenuBarEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectIsSideBarEnabled,
	selectIsTrayIconEnabled,
	selectServers,
} from '../../selectors';

function *watchMenuBarTemplate(store, rootWindow) {
	const selectAppMenuTemplate = createSelector(selectAppName, (appName) => ({
		label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
		submenu: [
			...process.platform === 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => store.dispatch({ type: MENU_BAR_ABOUT_CLICKED }),
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
					click: () => store.dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED }),
				},
				{ type: 'separator' },
			] : [],
			{
				label: t('Disable GPU'),
				enabled: !app.commandLine.hasSwitch('disable-gpu'),
				click: () => store.dispatch({ type: MENU_BAR_DISABLE_GPU }),
			},
			{ type: 'separator' },
			{
				label: t('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => store.dispatch({ type: MENU_BAR_QUIT_CLICKED }),
			},
		],
	}));

	const selectEditMenuTemplate = createSelector([
		selectFocusedWebContents,
		selectCanUndo,
		selectCanRedo,
		selectCanCut,
		selectCanCopy,
		selectCanPaste,
		selectCanSelectAll,
	], (focusedWebContents, canUndo, canRedo, canCut, canCopy, canPaste, canSelectAll) => ({
		label: t('menus.editMenu'),
		submenu: [
			{
				label: t('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				enabled: !!focusedWebContents && canUndo,
				click: () => focusedWebContents.undo(),
			},
			{
				label: t('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				enabled: !!focusedWebContents && canRedo,
				click: () => focusedWebContents.redo(),
			},
			{ type: 'separator' },
			{
				label: t('menus.cut'),
				accelerator: 'CommandOrControl+X',
				enabled: !!focusedWebContents && canCut,
				click: () => focusedWebContents.cut(),
			},
			{
				label: t('menus.copy'),
				accelerator: 'CommandOrControl+C',
				enabled: !!focusedWebContents && canCopy,
				click: () => focusedWebContents.copy(),
			},
			{
				label: t('menus.paste'),
				accelerator: 'CommandOrControl+V',
				enabled: !!focusedWebContents && canPaste,
				click: () => focusedWebContents.paste(),
			},
			{
				label: t('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				enabled: !!focusedWebContents && canSelectAll,
				click: () => focusedWebContents.selectAll(),
			},
		],
	}));

	const selectViewMenuTemplate = createSelector([
		selectIsSideBarEnabled,
		selectIsTrayIconEnabled,
		selectIsMenuBarEnabled,
		selectIsFullScreenEnabled,
	], (isSideBarEnabled, isTrayIconEnabled, isMenuBarEnabled, isFullScreenEnabled) => ({
		label: t('menus.viewMenu'),
		submenu: [
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => store.dispatch({ type: MENU_BAR_RELOAD_SERVER_CLICKED }),
			},
			{
				label: t('menus.reloadIgnoringCache'),
				click: () => store.dispatch({
					type: MENU_BAR_RELOAD_SERVER_CLICKED,
					payload: { ignoringCache: true },
				}),
			},
			{
				label: t('menus.openDevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => store.dispatch({ type: MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED }),
			},
			{ type: 'separator' },
			{
				label: t('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				click: () => store.dispatch({ type: MENU_BAR_GO_BACK_CLICKED }),
			},
			{
				label: t('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				click: () => store.dispatch({ type: MENU_BAR_GO_FORWARD_CLICKED }),
			},
			{ type: 'separator' },
			{
				label: t('menus.showTrayIcon'),
				type: 'checkbox',
				checked: isTrayIconEnabled,
				click: ({ checked }) => store.dispatch({
					type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
					payload: checked,
				}),
			},
			...process.platform === 'darwin' ? [
				{
					label: t('menus.showFullScreen'),
					type: 'checkbox',
					checked: isFullScreenEnabled,
					accelerator: 'Control+Command+F',
					click: ({ checked }) => store.dispatch({
						type: MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
						payload: checked,
					}),
				},
			] : [],
			...process.platform !== 'darwin' ? [
				{
					label: t('menus.showMenuBar'),
					type: 'checkbox',
					checked: isMenuBarEnabled,
					click: ({ checked }) => store.dispatch({
						type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
						payload: checked,
					}),
				},
			] : [],
			{
				label: t('menus.showServerList'),
				type: 'checkbox',
				checked: isSideBarEnabled,
				click: ({ checked }) => store.dispatch({
					type: MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
					payload: checked,
				}),
			},
			{ type: 'separator' },
			{
				label: t('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				click: () => store.dispatch({ type: MENU_BAR_RESET_ZOOM_CLICKED }),
			},
			{
				label: t('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				click: () => store.dispatch({ type: MENU_BAR_ZOOM_IN_CLICKED }),
			},
			{
				label: t('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				click: () => store.dispatch({ type: MENU_BAR_ZOOM_OUT_CLICKED }),
			},
		],
	}));

	const selectWindowMenuTemplate = createSelector([
		selectServers,
		selectCurrentServerUrl,
		selectIsShowWindowOnUnreadChangedEnabled,
	], (servers, currentServerUrl, isShowWindowOnUnreadChangedEnabled) => ({
		label: t('menus.windowMenu'),
		role: 'window',
		submenu: [
			...process.platform === 'darwin' ? [
				{
					label: t('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => store.dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED }),
				},
				{ type: 'separator' },
			] : [],
			...servers.length > 0 ? [
				...servers.map((server, i) => ({
					type: currentServerUrl ? 'checkbox' : 'normal',
					label: server.title.replace(/&/g, '&&'),
					checked: currentServerUrl === server.url,
					accelerator: `CommandOrControl+${ i + 1 }`,
					click: () => store.dispatch({
						type: MENU_BAR_SELECT_SERVER_CLICKED,
						payload: server.url,
					}),
				})),
				{ type: 'separator' },
			] : [],
			{
				type: 'checkbox',
				label: t('menus.showOnUnreadMessage'),
				checked: isShowWindowOnUnreadChangedEnabled,
				click: ({ checked }) => store.dispatch({
					type: MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
					payload: checked,
				}),
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
	}));

	const selectHelpMenuTemplate = createSelector(selectAppName, (appName) => ({
		label: t('menus.helpMenu'),
		role: 'help',
		submenu: [
			{
				label: t('menus.documentation'),
				click: () => store.dispatch({
					type: MENU_BAR_OPEN_URL_CLICKED,
					payload: 'https://rocket.chat/docs',
				}),
			},
			{
				label: t('menus.reportIssue'),
				click: () => store.dispatch({
					type: MENU_BAR_OPEN_URL_CLICKED,
					payload: 'https://github.com/RocketChat/Rocket.Chat/issues/new',
				}),
			},
			{ type: 'separator' },
			{
				label: t('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => store.dispatch({ type: MENU_BAR_RELOAD_APP_CLICKED }),
			},
			{
				label: t('menus.toggleDevTools'),
				click: () => store.dispatch({ type: MENU_BAR_TOGGLE_DEVTOOLS_CLICKED }),
			},
			{ type: 'separator' },
			{
				label: t('menus.clearTrustedCertificates'),
				click: () => store.dispatch({ type: MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED }),
			},
			{
				label: t('menus.resetAppData'),
				click: () => store.dispatch({ type: MENU_BAR_RESET_APP_DATA_CLICKED }),
			},
			{ type: 'separator' },
			{
				label: t('menus.learnMore'),
				click: () => store.dispatch({
					type: MENU_BAR_OPEN_URL_CLICKED,
					payload: 'https://rocket.chat',
				}),
			},
			...process.platform !== 'darwin' ? [
				{
					label: t('menus.about', { appName }),
					click: () => store.dispatch({ type: MENU_BAR_ABOUT_CLICKED }),
				},
			] : [],
		],
	}));

	const selectMenuBarTemplate = createSelector([
		selectAppMenuTemplate,
		selectEditMenuTemplate,
		selectViewMenuTemplate,
		selectWindowMenuTemplate,
		selectHelpMenuTemplate,
	], (...menus) => menus);

	yield takeEvery(storeChangeChannel(store, selectMenuBarTemplate), function *([menuBarTemplate]) {
		const menu = Menu.buildFromTemplate(menuBarTemplate);

		if (process.platform === 'darwin') {
			Menu.setApplicationMenu(menu);
			return;
		}

		Menu.setApplicationMenu(null);
		rootWindow.setMenu(menu);
	});
}

export function *menuBarSaga(rootWindow) {
	const store = yield getContext('store');

	yield fork(watchMenuBarTemplate, store, rootWindow);
}
